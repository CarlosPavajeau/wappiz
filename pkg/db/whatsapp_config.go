package db

// CanSend reports whether the tenant's WhatsApp configuration can deliver
// messages. A row can exist while onboarding is unfinished or after the
// tenant was deactivated, so its presence alone is not enough.
func (c FindTenantWhatsappConfigRow) CanSend() bool {
	return c.IsActive && c.PhoneNumberID.Valid && c.AccessToken.Valid
}
