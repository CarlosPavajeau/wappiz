package booking

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"

	"github.com/google/uuid"
)

// Customer identifies who an appointment is for: an [ExistingCustomer] or a
// [CustomerByPhone]. [Service.Create] resolves it inside the booking
// transaction, so a rejected booking leaves customers untouched.
type Customer interface {
	resolve(ctx context.Context, dbtx db.DBTX, tenantID uuid.UUID) (customerRecord, error)
}

// ExistingCustomer books for a customer that already exists, such as one
// picked from the dashboard.
type ExistingCustomer struct {
	ID uuid.UUID
}

// CustomerByPhone books for the tenant's customer with PhoneNumber, creating
// it when missing. Name only fills in a missing name: the number is not
// verified, so a stranger must not be able to rename an existing customer.
type CustomerByPhone struct {
	PhoneNumber string
	Name        string
}

type customerRecord struct {
	ID        uuid.UUID
	TenantID  uuid.UUID
	IsBlocked bool
}

func (c ExistingCustomer) resolve(ctx context.Context, dbtx db.DBTX, _ uuid.UUID) (customerRecord, error) {
	customer, err := db.Query.FindCustomerByID(ctx, dbtx, c.ID)
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return customerRecord{}, fault.Wrap(err, fault.Internal("find customer by id"))
		}
		return customerRecord{}, fault.Wrap(err,
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("customer not found for tenant"),
			fault.Public("El cliente no existe"),
		)
	}
	return customerRecord{ID: customer.ID, TenantID: customer.TenantID, IsBlocked: customer.IsBlocked}, nil
}

func (c CustomerByPhone) resolve(ctx context.Context, dbtx db.DBTX, tenantID uuid.UUID) (customerRecord, error) {
	customer, err := FindOrCreateCustomer(ctx, dbtx, tenantID, c.PhoneNumber)
	if err != nil {
		return customerRecord{}, err
	}
	if !customer.Name.Valid || strings.TrimSpace(customer.Name.String) == "" {
		if err := db.Query.UpdateCustomer(ctx, dbtx, db.UpdateCustomerParams{
			Name: sql.NullString{String: c.Name, Valid: true},
			ID:   customer.ID,
		}); err != nil {
			return customerRecord{}, fault.Wrap(err, fault.Internal("set customer name"))
		}
	}
	return customerRecord{ID: customer.ID, TenantID: customer.TenantID, IsBlocked: customer.IsBlocked}, nil
}

// FindOrCreateCustomer returns the tenant's customer for phoneNumber,
// inserting it first when it does not exist. The insert ignores the
// (tenant_id, phone_number) conflict, so concurrent callers for the same
// number converge on a single row.
func FindOrCreateCustomer(
	ctx context.Context,
	dbtx db.DBTX,
	tenantID uuid.UUID,
	phoneNumber string,
) (db.FindCustomerByPhoneNumberRow, error) {
	params := db.FindCustomerByPhoneNumberParams{
		TenantID:    tenantID,
		PhoneNumber: phoneNumber,
	}

	customer, err := db.Query.FindCustomerByPhoneNumber(ctx, dbtx, params)
	if err == nil {
		return customer, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return db.FindCustomerByPhoneNumberRow{}, fault.Wrap(err, fault.Internal("find customer by phone number"))
	}

	if err := db.Query.InsertCustomer(ctx, dbtx, db.InsertCustomerParams{
		ID:          uuid.New(),
		TenantID:    tenantID,
		PhoneNumber: phoneNumber,
	}); err != nil {
		return db.FindCustomerByPhoneNumberRow{}, fault.Wrap(err, fault.Internal("insert customer"))
	}

	customer, err = db.Query.FindCustomerByPhoneNumber(ctx, dbtx, params)
	if err != nil {
		return db.FindCustomerByPhoneNumberRow{}, fault.Wrap(err, fault.Internal("find newly created customer"))
	}

	return customer, nil
}
