package openapi

// BaseError Base error structure following Problem Details for HTTP APIs (RFC 7807). This provides a standardized way to carry machine-readable details of errors in HTTP response content.
type BaseError struct {
	// Detail A human-readable explanation specific to this occurrence of the problem. This provides detailed information about what went wrong and potential remediation steps. The message is intended to be helpful for developers troubleshooting the issue.
	Detail string `json:"detail"`

	// Status HTTP status code that corresponds to this error. This will match the status code in the HTTP response. Common codes include `400` (Bad Request), `401` (Unauthorized), `403` (Forbidden), `404` (Not Found), `409` (Conflict), and `500` (Internal Server Error).
	Status int `json:"status"`

	// Title A short, human-readable summary of the problem type. This remains constant from occurrence to occurrence of the same problem and should be used for programmatic handling.
	Title string `json:"title"`

	// Type A URI reference that identifies the problem type. This provides a stable identifier for the error that can be used for documentation lookups and programmatic error handling. When followed, this URI should provide human-readable documentation for the problem type.
	Type string `json:"type"`
}

// Meta Metadata object included in every API response. This provides context about the request and is essential for debugging, audit trails, and support inquiries. The `requestId` is particularly important when troubleshooting issues with the Wappiz support team.
type Meta struct {
	// RequestId A unique id for this request. Always include this ID when contacting support about a specific API request. This identifier allows Wappiz's support team to trace the exact request through logs and diagnostic systems to provide faster assistance.
	RequestId string `json:"requestId"`
}

// NotFoundErrorResponse Error response when the requested resource cannot be found. This occurs when:
// - The specified resource ID doesn't exist in your workspace
// - The resource has been deleted or moved
// - The resource exists but is not accessible with current permissions
//
// To resolve this error, verify the resource ID is correct and that you have access to it.
type NotFoundErrorResponse struct {
	// Error Base error structure following Problem Details for HTTP APIs (RFC 7807). This provides a standardized way to carry machine-readable details of errors in HTTP response content.
	Error BaseError `json:"error"`

	// Meta Metadata object included in every API response. This provides context about the request and is essential for debugging, audit trails, and support inquiries. The `requestId` is particularly important when troubleshooting issues with the Wappiz support team.
	Meta Meta `json:"meta"`
}

// BadRequestErrorResponse Error response for invalid requests that cannot be processed due to client-side errors. This typically occurs when request parameters are missing, malformed, or fail validation rules. The response includes detailed information about the specific errors in the request, including the location of each error and suggestions for fixing it. When receiving this error, check the 'errors' array in the response for specific validation issues that need to be addressed before retrying.
type BadRequestErrorResponse struct {
	// Error Extended error details specifically for bad request (400) errors. This builds on the BaseError structure by adding an array of individual validation errors, making it easy to identify and fix multiple issues at once.
	Error BaseError `json:"error"`

	// Meta Metadata object included in every API response. This provides context about the request and is essential for debugging, audit trails, and support inquiries. The `requestId` is particularly important when troubleshooting issues with the Wappiz support team.
	Meta Meta `json:"meta"`
}

// TooManyRequestsErrorResponse Error response when the client has sent too many requests in a given time period. This occurs when you've exceeded a rate limit or quota for the resource you're accessing.
//
// The rate limit resets automatically after the time window expires. To avoid this error:
// - Implement exponential backoff when retrying requests
// - Cache results where appropriate to reduce request frequency
// - Check the error detail message for specific quota information
// - Contact support if you need a higher quota for your use case
type TooManyRequestsErrorResponse struct {
	// Error Base error structure following Problem Details for HTTP APIs (RFC 7807). This provides a standardized way to carry machine-readable details of errors in HTTP response content.
	Error BaseError `json:"error"`

	// Meta Metadata object included in every API response. This provides context about the request and is essential for debugging, audit trails, and support inquiries. The `requestId` is particularly important when troubleshooting issues with the Wappiz support team.
	Meta Meta `json:"meta"`
}

// UnauthorizedErrorResponse Error response when authentication has failed or credentials are missing. This occurs when:
// - No authentication token is provided in the request
// - The provided token is invalid, expired, or malformed
// - The token format doesn't match expected patterns
//
// To resolve this error, ensure you're including a valid root key in the Authorization header.
type UnauthorizedErrorResponse struct {
	// Error Base error structure following Problem Details for HTTP APIs (RFC 7807). This provides a standardized way to carry machine-readable details of errors in HTTP response content.
	Error BaseError `json:"error"`

	// Meta Metadata object included in every API response. This provides context about the request and is essential for debugging, audit trails, and support inquiries. The `requestId` is particularly important when troubleshooting issues with the Wappiz support team.
	Meta Meta `json:"meta"`
}

// ForbiddenErrorResponse Error response when the provided credentials are valid but lack sufficient permissions for the requested operation. This occurs when:
// - The root key doesn't have the required permissions for this endpoint
// - The operation requires elevated privileges that the current key lacks
// - Access to the requested resource is restricted based on workspace settings
//
// To resolve this error, ensure your root key has the necessary permissions or contact your workspace administrator.
type ForbiddenErrorResponse struct {
	// Error Base error structure following Problem Details for HTTP APIs (RFC 7807). This provides a standardized way to carry machine-readable details of errors in HTTP response content.
	Error BaseError `json:"error"`

	// Meta Metadata object included in every API response. This provides context about the request and is essential for debugging, audit trails, and support inquiries. The `requestId` is particularly important when troubleshooting issues with the Wappiz support team.
	Meta Meta `json:"meta"`
}

// ConflictErrorResponse Error response when the request conflicts with the current state of the resource. This occurs when:
// - Attempting to create a resource that already exists
// - Modifying a resource that has been changed by another operation
// - Violating unique constraints or business rules
//
// To resolve this error, check the current state of the resource and adjust your request accordingly.
type ConflictErrorResponse struct {
	// Error Base error structure following Problem Details for HTTP APIs (RFC 7807). This provides a standardized way to carry machine-readable details of errors in HTTP response content.
	Error BaseError `json:"error"`

	// Meta Metadata object included in every API response. This provides context about the request and is essential for debugging, audit trails, and support inquiries. The `requestId` is particularly important when troubleshooting issues with the Wappiz support team.
	Meta Meta `json:"meta"`
}

// InternalServerErrorResponse Error response when an unexpected error occurs on the server. This indicates a problem with Wappiz's systems rather than your request.
//
// When you encounter this error:
// - The request ID in the response can help Wappiz support investigate the issue
// - The error is likely temporary and retrying may succeed
// - If the error persists, contact Wappiz support with the request ID
type InternalServerErrorResponse struct {
	// Error Base error structure following Problem Details for HTTP APIs (RFC 7807). This provides a standardized way to carry machine-readable details of errors in HTTP response content.
	Error BaseError `json:"error"`

	// Meta Metadata object included in every API response. This provides context about the request and is essential for debugging, audit trails, and support inquiries. The `requestId` is particularly important when troubleshooting issues with the Wappiz support team.
	Meta Meta `json:"meta"`
}
