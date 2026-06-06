import { defineRelations } from "drizzle-orm"

import * as schema from "./schema"

export const relations = defineRelations(schema, (r) => ({
  accounts: {
    user: r.one.users({
      from: r.accounts.userId,
      to: r.users.id,
    }),
  },
  users: {
    accounts: r.many.accounts(),
    appointments: r.many.appointments(),
    sessions: r.many.sessions(),
    tenants: r.many.tenants(),
  },
  appointmentPenaltyEvents: {
    appointment: r.one.appointments({
      from: r.appointmentPenaltyEvents.appointmentId,
      to: r.appointments.id,
    }),
    customer: r.one.customers({
      from: r.appointmentPenaltyEvents.customerId,
      to: r.customers.id,
    }),
    tenant: r.one.tenants({
      from: r.appointmentPenaltyEvents.tenantId,
      to: r.tenants.id,
    }),
  },
  appointmentFieldResponses: {
    appointment: r.one.appointments({
      from: r.appointmentFieldResponses.appointmentId,
      to: r.appointments.id,
    }),
  },
  appointments: {
    appointmentPenaltyEvents: r.many.appointmentPenaltyEvents(),
    appointmentReminderEvents: r.many.appointmentReminderEvents(),
    appointmentFieldResponses: r.many.appointmentFieldResponses(),
    users: r.many.users({
      from: r.appointments.id.through(r.appointmentStatusHistory.appointmentId),
      to: r.users.id.through(r.appointmentStatusHistory.changedBy),
    }),
    customer: r.one.customers({
      from: r.appointments.customerId,
      to: r.customers.id,
    }),
    resource: r.one.resources({
      from: r.appointments.resourceId,
      to: r.resources.id,
    }),
    service: r.one.services({
      from: r.appointments.serviceId,
      to: r.services.id,
    }),
    tenant: r.one.tenants({
      from: r.appointments.tenantId,
      to: r.tenants.id,
    }),
  },
  customers: {
    appointmentPenaltyEvents: r.many.appointmentPenaltyEvents(),
    appointmentReminderEvents: r.many.appointmentReminderEvents(),
    appointments: r.many.appointments(),
    conversationSessions: r.many.conversationSessions(),
    tenant: r.one.tenants({
      from: r.customers.tenantId,
      to: r.tenants.id,
    }),
  },
  tenants: {
    appointmentPenaltyEvents: r.many.appointmentPenaltyEvents(),
    appointmentReminderEvents: r.many.appointmentReminderEvents(),
    appointments: r.many.appointments(),
    conversationSessions: r.many.conversationSessions(),
    customers: r.many.customers(),
    domainEvents: r.many.domainEvents(),
    onboardingProgresses: r.many.onboardingProgress(),
    resources: r.many.resources(),
    services: r.many.services(),
    plans: r.many.plans(),
    tenantFlowFields: r.many.tenantFlowFields(),
    users: r.many.users({
      from: r.tenants.id.through(r.tenantUsers.tenantId),
      to: r.users.id.through(r.tenantUsers.userId),
    }),
    tenantWhatsappConfigs: r.many.tenantWhatsappConfigs(),
  },
  domainEvents: {
    tenant: r.one.tenants({
      from: r.domainEvents.tenantId,
      to: r.tenants.id,
    }),
  },
  appointmentReminderEvents: {
    appointment: r.one.appointments({
      from: r.appointmentReminderEvents.appointmentId,
      to: r.appointments.id,
    }),
    customer: r.one.customers({
      from: r.appointmentReminderEvents.customerId,
      to: r.customers.id,
    }),
    tenant: r.one.tenants({
      from: r.appointmentReminderEvents.tenantId,
      to: r.tenants.id,
    }),
  },
  resources: {
    appointments: r.many.appointments(),
    services: r.many.services({
      from: r.resources.id.through(r.resourceServices.resourceId),
      to: r.services.id.through(r.resourceServices.serviceId),
    }),
    tenant: r.one.tenants({
      from: r.resources.tenantId,
      to: r.tenants.id,
    }),
    scheduleOverrides: r.many.scheduleOverrides(),
    workingHours: r.many.workingHours(),
  },
  services: {
    appointments: r.many.appointments(),
    resources: r.many.resources(),
    tenant: r.one.tenants({
      from: r.services.tenantId,
      to: r.tenants.id,
    }),
  },
  conversationSessions: {
    customer: r.one.customers({
      from: r.conversationSessions.customerId,
      to: r.customers.id,
    }),
    tenant: r.one.tenants({
      from: r.conversationSessions.tenantId,
      to: r.tenants.id,
    }),
    tenantWhatsappConfig: r.one.tenantWhatsappConfigs({
      from: r.conversationSessions.whatsappConfigId,
      to: r.tenantWhatsappConfigs.id,
    }),
  },
  tenantWhatsappConfigs: {
    conversationSessions: r.many.conversationSessions(),
    tenant: r.one.tenants({
      from: r.tenantWhatsappConfigs.tenantId,
      to: r.tenants.id,
    }),
  },
  onboardingProgress: {
    tenant: r.one.tenants({
      from: r.onboardingProgress.tenantId,
      to: r.tenants.id,
    }),
  },
  scheduleOverrides: {
    resource: r.one.resources({
      from: r.scheduleOverrides.resourceId,
      to: r.resources.id,
    }),
  },
  sessions: {
    user: r.one.users({
      from: r.sessions.userId,
      to: r.users.id,
    }),
  },
  subscriptionOrders: {
    subscription: r.one.subscriptions({
      from: r.subscriptionOrders.subscriptionId,
      to: r.subscriptions.id,
    }),
  },
  subscriptions: {
    subscriptionOrders: r.many.subscriptionOrders(),
  },
  plans: {
    tenants: r.many.tenants({
      from: r.plans.id.through(r.subscriptions.planId),
      to: r.tenants.id.through(r.subscriptions.tenantId),
    }),
  },
  tenantFlowFields: {
    tenant: r.one.tenants({
      from: r.tenantFlowFields.tenantId,
      to: r.tenants.id,
    }),
  },
  workingHours: {
    resource: r.one.resources({
      from: r.workingHours.resourceId,
      to: r.resources.id,
    }),
  },
}))
