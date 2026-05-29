// Package datetime provides helpers for parsing and formatting appointment
// date/time values.
//
// Formatting uses the America/Bogota timezone and replaces English weekday and
// month names with Spanish equivalents. Parsing accepts conversational
// day/month and 12-hour clock inputs without a year, inferring the current year
// and advancing past dates by one year.
package datetime
