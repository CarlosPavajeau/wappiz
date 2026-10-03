package booking

import (
	"context"
	"database/sql"
	"errors"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"

	"github.com/google/uuid"
)

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
