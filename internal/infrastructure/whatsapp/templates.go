package whatsapp

type TemplateName string

const (
	TemplateReservationConfirmed TemplateName = "reservation_confirmed"
	TemplateCheckInReminder      TemplateName = "check_in_reminder"
	TemplateWelcomeGuest         TemplateName = "welcome_guest"
	TemplateCheckOutReminder     TemplateName = "check_out_reminder"
	TemplateInvoice              TemplateName = "invoice"
	TemplateSpecialOffer         TemplateName = "special_offer"
	TemplateFeedbackRequest      TemplateName = "feedback_request"
	TemplateNightAuditSummary    TemplateName = "night_audit_summary"
)

type TemplateData struct {
	Name     TemplateName
	Language string
	Params   []string
}

var Templates = map[TemplateName]TemplateData{
	TemplateReservationConfirmed: {
		Name:     TemplateReservationConfirmed,
		Language: "es",
	},
	TemplateCheckInReminder: {
		Name:     TemplateCheckInReminder,
		Language: "es",
	},
	TemplateWelcomeGuest: {
		Name:     TemplateWelcomeGuest,
		Language: "es",
	},
	TemplateCheckOutReminder: {
		Name:     TemplateCheckOutReminder,
		Language: "es",
	},
	TemplateInvoice: {
		Name:     TemplateInvoice,
		Language: "es",
	},
	TemplateSpecialOffer: {
		Name:     TemplateSpecialOffer,
		Language: "es",
	},
	TemplateFeedbackRequest: {
		Name:     TemplateFeedbackRequest,
		Language: "es",
	},
	TemplateNightAuditSummary: {
		Name:     TemplateNightAuditSummary,
		Language: "es",
	},
}

func GetTemplate(name TemplateName) (TemplateData, bool) {
	t, ok := Templates[name]
	return t, ok
}
