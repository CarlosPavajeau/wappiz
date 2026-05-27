CREATE TYPE "appointment_status" AS ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'check_in');
CREATE TYPE "flow_field_type" AS ENUM('predefined', 'custom');
CREATE TYPE "whatsapp_activation_status" AS ENUM('pending', 'in_progress', 'active', 'failed');
