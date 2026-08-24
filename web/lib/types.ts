// ─── Shared primitives ────────────────────────────────────────────────

export type ID = string;
export type CurrencyCode = string;
/** All monetary values are integer cents (e.g. 15050 = $150.50 DOP). */
export type Cents = number;

export type RoomStatus = "available" | "occupied" | "cleaning" | "maintenance";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "canceled";

export type FolioEntryType =
  | "charge"
  | "payment"
  | "refund"
  | "deposit"
  | "adjustment"
  | "transfer";

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type HousekeepingTaskStatus = "pending" | "in_progress" | "completed";
export type HousekeepingTaskType =
  | "cleaning"
  | "maintenance"
  | "inspection"
  | "turnover";

export type MaintenanceCategory =
  | "general"
  | "plumbing"
  | "electrical"
  | "hvac"
  | "furniture"
  | "appliance"
  | "structural"
  | "safety";

export type MaintenanceStatus = "open" | "in_progress" | "completed";

export type StaffRole =
  | "admin"
  | "manager"
  | "front_desk"
  | "housekeeping"
  | "maintenance"
  | "read_only";

export type NCFType = "B01" | "B02" | "B03" | "B04";
export type PaymentMethod = "cash" | "card" | "transfer" | "check" | "mobile" | "other";
export type NightAuditStatus = "completed" | "running" | "failed";

// ─── Rooms ────────────────────────────────────────────────────────────

export interface Room {
  id: ID;
  tenant_id?: ID;
  room_type_id?: ID;
  number: string;
  floor?: string;
  status: RoomStatus;
}

/** Room row as enriched by the front-desk endpoint. */
export interface RoomStatusView {
  id: ID;
  number: string;
  floor?: string;
  room_type?: string;
  status: RoomStatus;
  guest_name?: string;
  reservation_id?: ID;
  check_in?: string;
  check_out?: string;
}

export interface RoomType {
  id: ID;
  tenant_id?: ID;
  name: string;
  capacity: number;
  base_price_cents: Cents;
  currency?: CurrencyCode;
  /** Comma-separated or free-form amenities description. */
  amenities?: string;
}

export interface CreateRoomInput {
  room_type_id: string;
  number: string;
  floor?: string;
}

// ─── Rates & seasons ─────────────────────────────────────────────────

export interface Rate {
  id: ID;
  tenant_id?: ID;
  name: string;
  amount_cents: Cents;
  currency?: CurrencyCode;
  start_date: string;
  end_date: string;
}

export interface RateSeason {
  id: ID;
  tenant_id?: ID;
  room_type_id: ID;
  name: string;
  start_date: string;
  end_date: string;
  amount_cents: Cents;
  currency?: CurrencyCode;
  priority?: number;
  active?: boolean;
}

export interface CreateRateInput {
  name: string;
  amount_cents: number;
  currency?: string;
  start_date: string;
  end_date: string;
}

export interface CreateRateSeasonInput {
  room_type_id: string;
  name: string;
  start_date: string;
  end_date: string;
  amount_cents: number;
  currency?: string;
  priority?: number;
}

// ─── Reservations ────────────────────────────────────────────────────

export interface Reservation {
  id: ID;
  tenant_id?: ID;
  guest_id: ID;
  room_id: ID;
  rate_id?: ID;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  total_cents: Cents;
  currency: CurrencyCode;
  status: ReservationStatus;
  /** Joined fields returned by some endpoints. */
  room_number?: string;
  guest_name?: string;
  created_at?: string;
}

export interface CreateReservationInput {
  reservation_id?: ID;
  guest_id: string;
  room_id: string;
  rate_id: string;
  check_in: string;
  check_out: string;
  adults: number;
  children?: number;
  total_cents?: number;
  currency?: string;
}

// ─── Guests ──────────────────────────────────────────────────────────

export interface Guest {
  id: ID;
  tenant_id?: ID;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  country?: string;
  id_type?: string;
  id_number?: string;
  created_at?: string;
}

export interface CreateGuestInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

export interface GuestPreference {
  key: string;
  value: string;
}

/**
 * Guest profile as consumed by app/guests/[id].
 * Some backends return a flat profile (no nested `guest`), hence the
 * duplicated identity/stats fields below are optional.
 */
export interface GuestProfile {
  id: ID;
  guest?: Guest;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  country?: string;
  id_type?: string;
  id_number?: string;
  preferences?: GuestPreference[];
  tags?: string[];
  reservations?: Reservation[];
  total_stays?: number;
  total_spent_cents?: Cents;
  currency?: CurrencyCode;
  average_stay_nights?: number;
  last_stay?: string;
  last_stay_date?: string;
  notes?: string;
}

// ─── Availability ────────────────────────────────────────────────────

export interface AvailableRoom {
  room_id: ID;
  room_number: string;
  room_type: string;
  floor?: string;
  price_cents: Cents;
  currency: CurrencyCode;
}

export type AvailabilityResult = AvailableRoom[];

// ─── Front desk (combined daily view) ────────────────────────────────

export interface TodayArrival {
  reservation_id: ID;
  guest_id: ID;
  guest_name: string;
  room_number: string;
  room_id: ID;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  status: ReservationStatus;
}

export interface TodayDeparture {
  reservation_id: ID;
  guest_id: ID;
  guest_name: string;
  room_number: string;
  room_id: ID;
  check_in: string;
  check_out: string;
  status: ReservationStatus;
}

export interface InHouseGuest {
  reservation_id: ID;
  guest_id: ID;
  guest_name: string;
  room_number: string;
  room_id: ID;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
}

export interface FrontDeskSummary {
  total_rooms?: number;
  available?: number;
  occupied?: number;
  arrivals?: number;
  departures?: number;
  in_house?: number;
  arrivals_today?: number;
  departures_today?: number;
  in_house_count?: number;
}

export interface FrontDeskToday {
  date: string;
  rooms: RoomStatusView[];
  arrivals: TodayArrival[];
  departures: TodayDeparture[];
  in_house: InHouseGuest[];
  summary: FrontDeskSummary;
}

// ─── Folio ───────────────────────────────────────────────────────────

export interface FolioEntry {
  id: ID;
  tenant_id?: ID;
  reservation_id?: ID;
  type: FolioEntryType;
  description: string;
  amount_cents: Cents;
  currency?: CurrencyCode;
  reference?: string;
  metadata?: string;
  created_by?: string;
  created_at: string;
}

export interface FolioEntryInput {
  type: FolioEntryType;
  description: string;
  amount_cents: number;
  currency?: string;
  reference?: string;
}

export interface FolioResponse {
  id?: ID;
  tenant_id?: ID;
  reservation_id: ID;
  entries: FolioEntry[];
  balance: Cents;
  closed: boolean;
  closed_at?: string;
}

export interface FolioTotals {
  charges: Cents;
  credits: Cents;
  balance: Cents;
}

// ─── Payments & receipts ─────────────────────────────────────────────

export interface Payment {
  id: ID;
  tenant_id?: ID;
  reservation_id: ID;
  guest_id?: ID;
  method: PaymentMethod;
  amount_cents: Cents;
  currency: CurrencyCode;
  reference?: string;
  status?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface CreatePaymentInput {
  reservation_id: string;
  method?: PaymentMethod;
  amount_cents: number;
  currency?: string;
  reference?: string;
  notes?: string;
  created_by?: string;
}

export interface Receipt {
  payment_id: ID;
  reservation_id: ID;
  method: PaymentMethod;
  amount_cents: Cents;
  currency: CurrencyCode;
  reference?: string;
  date: string;
  received_by?: string;
}

// ─── Housekeeping ────────────────────────────────────────────────────

export interface HousekeepingTask {
  id: ID;
  room_id: ID;
  room_number?: string;
  task_type: HousekeepingTaskType;
  status: HousekeepingTaskStatus;
  priority: TaskPriority;
  assigned_to?: string;
  notes?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface CreateHousekeepingTaskInput {
  room_id: string;
  task_type?: HousekeepingTaskType;
  priority?: TaskPriority;
  notes?: string;
  assigned_to?: string;
}

// ─── Maintenance ─────────────────────────────────────────────────────

export interface MaintenanceRequest {
  id: ID;
  room_id: ID;
  room_number?: string;
  title?: string;
  description: string;
  category: MaintenanceCategory;
  priority: TaskPriority;
  status: MaintenanceStatus;
  reported_by?: string;
  assigned_to?: string;
  cost_cents?: Cents;
  notes?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface CreateMaintenanceRequestInput {
  room_id: string;
  category: MaintenanceCategory;
  priority?: TaskPriority;
  description: string;
  title?: string;
  reported_by?: string;
}

export interface UpdateMaintenanceStatusInput {
  status: MaintenanceStatus;
  assigned_to?: string;
  cost_cents?: number;
  notes?: string;
}

// ─── Staff ───────────────────────────────────────────────────────────

export interface Staff {
  id: ID;
  user_id?: ID;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  role: StaffRole;
  department?: string;
  shift?: string;
  active: boolean;
  hire_date?: string;
}

export interface CreateStaffInput {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  password?: string;
  pin?: string;
  role: StaffRole;
  department?: string;
  shift?: string;
  hire_date?: string;
}

// ─── Night audit ─────────────────────────────────────────────────────

export interface NightAuditRun {
  id?: ID;
  run_id?: ID;
  tenant_id?: ID;
  run_date: string;
  reservations_processed: number;
  charges_posted: Cents;
  total_revenue: Cents;
  status: NightAuditStatus;
  started_at?: string;
  completed_at?: string;
  created_by?: string;
}

export type NightAuditHistory = NightAuditRun[];

// ─── Reports ─────────────────────────────────────────────────────────

export interface ReportDashboard {
  date?: string;
  occupancy_rate?: number;
  occupied_rooms?: number;
  available_rooms?: number;
  total_rooms?: number;
  adr?: Cents;
  revpar?: Cents;
  total_revenue?: Cents;
  today_revenue_cents?: Cents;
  month_revenue_cents?: Cents;
  total_reservations?: number;
  active_guests?: number;
  pending_tasks?: number;
  open_maintenance?: number;
  currency?: CurrencyCode;
}

export interface OccupancyPoint {
  date: string;
  occupancy_rate: number;
  total_rooms?: number;
  occupied?: number;
  available?: number;
  out_of_order?: number;
  arrivals?: number;
  departures?: number;
  in_house?: number;
}

export interface OccupancySeries {
  data: OccupancyPoint[];
  average?: number;
}

export interface RevenuePoint {
  date: string;
  revenue_cents: Cents;
  reservations: number;
}

export interface RevenueSeries {
  data: RevenuePoint[];
  total_cents?: Cents;
  average_cents?: Cents;
}

export interface CountryStat {
  country: string;
  count: number;
}

export interface GuestStats {
  total_guests: number;
  new_guests?: number;
  returning_guests: number;
  avg_stay_nights?: number;
  average_stay_nights?: number;
  average_spend_cents?: Cents;
  top_countries: CountryStat[];
  currency?: CurrencyCode;
}

// ─── Fiscal (e-CF / DGII) ────────────────────────────────────────────

export interface FiscalReceipt {
  id: ID;
  ncf?: string;
  ncf_number?: string;
  ncf_type: NCFType;
  rnc?: string;
  customer_rnc?: string;
  rnc_name?: string;
  subtotal_cents: Cents;
  itbis_cents: Cents;
  propina_cents: Cents;
  total_cents: Cents;
  currency: CurrencyCode;
  status?: string;
  dgii_status?: string;
  issued_at: string;
  reservation_id?: ID;
  payment_id?: ID;
}

export interface CreateFiscalReceiptInput {
  reservation_id: string;
  customer_rnc?: string;
  rnc?: string;
  ncf_type: NCFType;
  forma_pago?: string;
  subtotal_cents?: number;
}

export interface FiscalSummary {
  date?: string;
  total_receipts: number;
  total_itbis_cents: Cents;
  total_propina_cents: Cents;
  total_revenue_cents: Cents;
  subtotal_cents?: Cents;
  itbis_cents?: Cents;
  propina_cents?: Cents;
  total_cents?: Cents;
  pending_dgii?: number;
  currency?: CurrencyCode;
}

export interface RNCValidationResult {
  valid: boolean;
  rnc: string;
  name?: string;
}

// ─── WhatsApp ────────────────────────────────────────────────────────

export type WhatsAppDirection = "inbound" | "outbound";
export type WhatsAppMessageStatus =
  | "received"
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export interface WhatsAppMessage {
  id: ID;
  tenant_id?: ID;
  reservation_id?: ID;
  guest_id?: ID;
  direction: WhatsAppDirection;
  from_number: string;
  to_number: string;
  content: string;
  message_type?: string;
  external_id?: string;
  status: WhatsAppMessageStatus;
  created_at: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
}

export interface SendWhatsAppMessageInput {
  reservation_id?: string;
  to: string;
  template?: string;
  message?: string;
  language?: string;
}

// ─── Channel manager ─────────────────────────────────────────────────

export type ChannelName = "booking_com" | "expedia" | "airbnb" | "hostelworld" | "custom";

export interface Channel {
  id: ID;
  channel_name: ChannelName;
  property_id: string;
  api_key?: string;
  api_secret?: string;
  sync_enabled: boolean;
  sync_rates: boolean;
  sync_availability: boolean;
  sync_reservations: boolean;
  last_sync_at?: string;
}

export interface ChannelSyncLog {
  id: ID;
  channel_name: ChannelName;
  sync_type: string;
  direction: "inbound" | "outbound";
  entity_type: string;
  entity_id?: string;
  status: "success" | "failed" | "partial";
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface SyncResult {
  success: boolean;
  synced?: number;
  failed?: number;
  error?: string;
}

// ─── Auth & users ────────────────────────────────────────────────────

export interface UserInfo {
  id: ID;
  email: string;
  role: StaffRole;
  full_name: string;
  tenant_id: ID;
}

export type User = UserInfo;

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: UserInfo;
}

export interface RefreshTokenResponse {
  access_token: string;
  expires_in: number;
}

// ─── Misc UI/state types found across pages ──────────────────────────

export interface UiMessage {
  type: "success" | "error";
  text: string;
}

export interface DashboardStats {
  total: number;
  available: number;
  occupied: number;
  cleaning: number;
  maintenance: number;
  reservations: number;
  guests: number;
}

export interface FloorOccupancy {
  floor: string;
  total: number;
  occupied: number;
  pct: number;
}
