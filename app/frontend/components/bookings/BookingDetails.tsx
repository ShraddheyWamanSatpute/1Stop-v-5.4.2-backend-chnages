"use client";

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  Chip,
  Divider,
  Box,
  TextField,
  Snackbar,
  Alert,
  Dialog as MuiDialog,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Event as EventIcon,
  AccessTime as TimeIcon,
  Group as GroupIcon,
  TableBar as TableIcon,
  Notes as NotesIcon,
  Restaurant as RestaurantIcon,
  Payment as PaymentIcon,
} from "@mui/icons-material";
import { Booking, BookingStatus, Table, BookingTag, useBookings } from "../../../backend/context/BookingsContext";
import { useCompany } from "../../../backend/context/CompanyContext";
import { format, parseISO } from "date-fns";
import { debugWarn } from "../../../utils/debugLog";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

interface BookingDetailsProps {
  open: boolean;
  onClose: () => void;
  booking: Booking;
  tableName: string;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate?: (bookingId: string, updates: Partial<Booking>) => Promise<void>;
  bookingStatuses?: BookingStatus[];
  tables?: Table[];
  bookingTags?: BookingTag[];
}

const BookingDetails: React.FC<BookingDetailsProps> = ({
  open,
  onClose,
  booking,
  tableName,
  onDelete,
  onUpdate,
  bookingStatuses = [],
  tables = [],
}) => {
  const { companyID, siteID } = useBookings();
  const { state: companyState } = useCompany();
  const [shareOpen, setShareOpen] = React.useState(false);
  const [emails, setEmails] = React.useState<string>(booking?.email ? booking.email : "");
  const [sending, setSending] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState<{open: boolean; message: string; severity: "success"|"error"}>({open:false, message:"", severity:"success"});
  const [isEditing, setIsEditing] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [editedBooking, setEditedBooking] = React.useState<Booking>(booking);

  // Sync edited booking when booking prop changes
  React.useEffect(() => {
    setEditedBooking(booking);
  }, [booking]);

  const handleUpdate = async () => {
    if (!onUpdate) return;

    try {
      setUpdating(true);
      await onUpdate(booking.id, editedBooking);
      setSnackbar({open: true, message: "Booking updated successfully", severity: "success"});
      setIsEditing(false);
    } catch (error) {
      debugWarn("Error updating booking:", error);
      setSnackbar({open: true, message: "Failed to update booking", severity: "error"});
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    setEditedBooking(booking);
    setIsEditing(false);
  };

  const getTableName = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    return table ? table.name : tableId;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Confirmed":
        return "success";
      case "Pending":
        return "warning";
      case "Cancelled":
        return "error";
      case "Completed":
        return "info";
      case "No-Show":
        return "default";
      default:
        return "default";
    }
  };

  const preorderLink = React.useMemo(() => {
    const bookingId = booking?.id || "";
    const resolvedCompanyId = companyID || companyState.selectedCompanyID || companyState.companyID;
    const resolvedSiteId = siteID || companyState.selectedSiteID;
    if (!bookingId || !resolvedCompanyId || !resolvedSiteId) return "";
    const origin = typeof window !== 'undefined' ? window.location.origin : "";
    return `${origin}/Preorder/${resolvedCompanyId}/${resolvedSiteId}/${bookingId}`;
  }, [booking?.id, companyID, companyState.companyID, companyState.selectedCompanyID, companyState.selectedSiteID, siteID]);

  const handleSendLinks = async () => {
    try {
      setSending(true);
      const list = (emails || "").split(/[,;\s]+/).map(e => e.trim()).filter(Boolean);
      if (list.length === 0) {
        setSnackbar({open:true, message:"Enter at least one email", severity:"error"});
        setSending(false);
        return;
      }

      const subject = encodeURIComponent(`Preorder link for booking ${booking.firstName || ""} ${booking.lastName || ""}`.trim());
      const body = encodeURIComponent(`Preorder link:\n${preorderLink}`);
      window.location.href = `mailto:${list.join(",")}?subject=${subject}&body=${body}`;
      setSnackbar({open:true, message:"Opened your email client with the preorder link", severity:"success"});
      setShareOpen(false);
    } catch (e) {
      setSnackbar({open:true, message:"Failed to send emails", severity:"error"});
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {isEditing ? "Edit Booking" : "Booking Details"}
          </Typography>
          {!isEditing ? (
            <Chip
              label={editedBooking.status}
              color={getStatusColor(editedBooking.status) as any}
            />
          ) : (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={editedBooking.status}
                onChange={(e) => setEditedBooking(prev => ({ ...prev, status: e.target.value }))}
                label="Status"
              >
                {bookingStatuses.map((status) => (
                  <MenuItem key={status.id || status.name} value={status.name}>
                    {status.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      </DialogTitle>
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>
                <Typography variant="subtitle2">Customer Information</Typography>
              </Divider>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" gap={1}>
                <PersonIcon color="primary" />
                <Typography>
                  <strong>Name:</strong>
                </Typography>
                {isEditing ? (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      size="small"
                      value={editedBooking.firstName || ''}
                      onChange={(e) => setEditedBooking(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="First Name"
                      sx={{ minWidth: 120 }}
                    />
                    <TextField
                      size="small"
                      value={editedBooking.lastName || ''}
                      onChange={(e) => setEditedBooking(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Last Name"
                      sx={{ minWidth: 120 }}
                    />
                  </Box>
                ) : (
                  <Typography>{booking.firstName} {booking.lastName}</Typography>
                )}
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" gap={1}>
                <EmailIcon color="primary" />
                <Typography>
                  <strong>Email:</strong>
                </Typography>
                {isEditing ? (
                  <TextField
                    size="small"
                    type="email"
                    value={editedBooking.email || ''}
                    onChange={(e) => setEditedBooking(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email"
                    sx={{ minWidth: 200 }}
                  />
                ) : (
                  <Typography>{booking.email}</Typography>
                )}
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" gap={1}>
                <PhoneIcon color="primary" />
                <Typography>
                  <strong>Phone:</strong>
                </Typography>
                {isEditing ? (
                  <TextField
                    size="small"
                    value={editedBooking.phone || ''}
                    onChange={(e) => setEditedBooking(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone"
                    sx={{ minWidth: 150 }}
                  />
                ) : (
                  <Typography>{booking.phone}</Typography>
                )}
              </Box>
            </Grid>

            {booking.company && (
              <Grid item xs={12} md={6}>
                <Typography>
                  <strong>Company:</strong> {booking.company}
                </Typography>
              </Grid>
            )}

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>
                <Typography variant="subtitle2">Booking Details</Typography>
              </Divider>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" gap={1}>
                <EventIcon color="primary" />
                <Typography>
                  <strong>Date:</strong>
                </Typography>
                {isEditing ? (
                  <DatePicker
                    value={parseISO(editedBooking.date)}
                    onChange={(date) => {
                      if (date) {
                        setEditedBooking(prev => ({ ...prev, date: format(date, 'yyyy-MM-dd') }));
                      }
                    }}
                    slotProps={{
                      textField: {
                        size: 'small',
                        sx: { minWidth: 150 }
                      }
                    }}
                  />
                ) : (
                  <Typography>
                    {format(new Date(booking.date), "EEEE, MMMM do, yyyy")}
                  </Typography>
                )}
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" gap={1}>
                <TimeIcon color="primary" />
                <Typography>
                  <strong>Time:</strong>
                </Typography>
                {isEditing ? (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TimePicker
                      value={parseISO(`2000-01-01T${editedBooking.arrivalTime}:00`)}
                      onChange={(time) => {
                        if (time) {
                          setEditedBooking(prev => ({ ...prev, arrivalTime: format(time, 'HH:mm') }));
                        }
                      }}
                      slotProps={{
                        textField: {
                          size: 'small',
                          sx: { minWidth: 100 }
                        }
                      }}
                    />
                    <Typography>for</Typography>
                    <TextField
                      size="small"
                      type="number"
                      value={editedBooking.duration || ''}
                      onChange={(e) => setEditedBooking(prev => ({ ...prev, duration: parseFloat(e.target.value) || 0 }))}
                      placeholder="Hours"
                      sx={{ minWidth: 80 }}
                      inputProps={{ min: 0.5, max: 8, step: 0.5 }}
                    />
                    <Typography>hours</Typography>
                  </Box>
                ) : (
                  <Typography>
                    {booking.arrivalTime} -{" "}
                    {booking.until || "Not specified"}
                  </Typography>
                )}
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" gap={1}>
                <GroupIcon color="primary" />
                <Typography>
                  <strong>Guests:</strong>
                </Typography>
                {isEditing ? (
                  <TextField
                    size="small"
                    type="number"
                    value={editedBooking.guests || ''}
                    onChange={(e) => setEditedBooking(prev => ({ ...prev, guests: parseInt(e.target.value) || 1 }))}
                    placeholder="Guests"
                    sx={{ minWidth: 80 }}
                    inputProps={{ min: 1, max: 20 }}
                  />
                ) : (
                  <Typography>{booking.guests}</Typography>
                )}
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" gap={1}>
                <TableIcon color="primary" />
                <Typography>
                  <strong>Table{editedBooking.selectedTables && editedBooking.selectedTables.length > 1 ? 's' : ''}:</strong>
                </Typography>
                {isEditing ? (
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Tables</InputLabel>
                    <Select
                      multiple
                      value={editedBooking.selectedTables || []}
                      onChange={(e) => {
                        const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                        setEditedBooking(prev => ({ ...prev, selectedTables: value }));
                      }}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((tableId) => (
                            <Chip key={tableId} label={getTableName(tableId)} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {tables.map((table) => (
                        <MenuItem key={table.id} value={table.id}>
                          {table.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {editedBooking.selectedTables && editedBooking.selectedTables.length > 0 ? (
                      editedBooking.selectedTables.map((tableId) => (
                        <Chip key={tableId} label={getTableName(tableId)} size="small" />
                      ))
                    ) : (
                      <Typography>{tableName}</Typography>
                    )}
                  </Box>
                )}
              </Box>
            </Grid>

            {editedBooking.bookingType && (
              <Grid item xs={12} md={6}>
                <Box display="flex" alignItems="center" gap={1}>
                  <RestaurantIcon color="primary" />
                  <Typography>
                    <strong>Booking Type:</strong> {editedBooking.bookingType}
                  </Typography>
                </Box>
              </Grid>
            )}

            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" gap={1}>
                <TimeIcon color="primary" />
                <Typography>
                  <strong>Tracking:</strong>
                </Typography>
                {isEditing ? (
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={editedBooking.tracking || "Not Arrived"}
                      onChange={(e) => setEditedBooking(prev => ({ ...prev, tracking: e.target.value as any }))}
                      label="Status"
                    >
                      <MenuItem value="Not Arrived">Not Arrived</MenuItem>
                      <MenuItem value="Arrived">Arrived</MenuItem>
                      <MenuItem value="Seated">Seated</MenuItem>
                      <MenuItem value="Appetizers">Appetizers</MenuItem>
                      <MenuItem value="Starters">Starters</MenuItem>
                      <MenuItem value="Mains">Mains</MenuItem>
                      <MenuItem value="Desserts">Desserts</MenuItem>
                      <MenuItem value="Bill">Bill</MenuItem>
                      <MenuItem value="Paid">Paid</MenuItem>
                    </Select>
                  </FormControl>
                ) : (
                  <Typography>{editedBooking.tracking || "Not Arrived"}</Typography>
                )}
              </Box>
            </Grid>

            {(booking.deposit !== undefined ||
              booking.depositPaid !== undefined) && (
              <Grid item xs={12} md={6}>
                <Box display="flex" alignItems="center" gap={1}>
                  <PaymentIcon color="primary" />
                  <Typography>
                    <strong>Deposit:</strong>{" "}
                    {booking.deposit ? `£${booking.deposit}` : "None"}
                    {booking.depositPaid
                      ? " (Paid)"
                      : booking.deposit
                      ? " (Not Paid)"
                      : ""}
                  </Typography>
                </Box>
              </Grid>
            )}

            {(booking.specialRequests ||
              booking.dietaryRequirements ||
              booking.notes) && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Typography variant="subtitle2">
                      Additional Information
                    </Typography>
                  </Divider>
                </Grid>

                {booking.specialRequests && (
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="flex-start" gap={1}>
                      <NotesIcon color="primary" sx={{ mt: 0.5 }} />
                      <Typography>
                        <strong>Special Requests:</strong>{" "}
                        {isEditing ? (
                          <TextField
                            fullWidth
                            multiline
                            rows={2}
                            value={editedBooking.specialRequests || ''}
                            onChange={(e) => setEditedBooking(prev => ({ ...prev, specialRequests: e.target.value }))}
                            placeholder="Special requests"
                            sx={{ mt: 1 }}
                          />
                        ) : (
                          booking.specialRequests
                        )}
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {booking.dietaryRequirements && (
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="flex-start" gap={1}>
                      <RestaurantIcon color="primary" sx={{ mt: 0.5 }} />
                      <Typography>
                        <strong>Dietary Requirements:</strong>{" "}
                        {isEditing ? (
                          <TextField
                            fullWidth
                            multiline
                            rows={2}
                            value={editedBooking.dietaryRequirements || ''}
                            onChange={(e) => setEditedBooking(prev => ({ ...prev, dietaryRequirements: e.target.value }))}
                            placeholder="Dietary requirements"
                            sx={{ mt: 1 }}
                          />
                        ) : (
                          booking.dietaryRequirements
                        )}
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {booking.notes && (
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="flex-start" gap={1}>
                      <NotesIcon color="primary" sx={{ mt: 0.5 }} />
                      <Typography>
                        <strong>Notes:</strong>{" "}
                        {isEditing ? (
                          <TextField
                            fullWidth
                            multiline
                            rows={3}
                            value={editedBooking.notes || ''}
                            onChange={(e) => setEditedBooking(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Notes"
                            sx={{ mt: 1 }}
                          />
                        ) : (
                          booking.notes
                        )}
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </>
            )}

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>
                <Typography variant="subtitle2">System Information</Typography>
              </Divider>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="textSecondary">
                <strong>Created:</strong>{" "}
                {format(new Date(booking.createdAt), "dd/MM/yyyy HH:mm")}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="textSecondary">
                <strong>Last Updated:</strong>{" "}
                {format(new Date(booking.updatedAt), "dd/MM/yyyy HH:mm")}
              </Typography>
            </Grid>
          </Grid>
        </LocalizationProvider>
        {booking.preorder && (
          <>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>
                <Typography variant="subtitle2">Preorders</Typography>
              </Divider>
            </Grid>
            {booking.preorder.notes && (
              <Grid item xs={12}>
                <Typography><strong>Notes:</strong> {booking.preorder.notes}</Typography>
              </Grid>
            )}
          </>
        )}

        {(booking.payments?.depositAmount || booking.payments?.stripePaymentLink) && (
          <>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>
                <Typography variant="subtitle2">Payments</Typography>
              </Divider>
            </Grid>
            {booking.payments?.depositAmount !== undefined && (
              <Grid item xs={12} md={6}>
                <Box display="flex" alignItems="center" gap={1}>
                  <PaymentIcon color="primary" />
                  <Typography>
                    <strong>Deposit Due:</strong> £{booking.payments?.depositAmount?.toFixed?.(2) || booking.payments?.depositAmount}
                  </Typography>
                </Box>
              </Grid>
            )}
            {booking.payments?.stripePaymentLink && (
              <Grid item xs={12}>
                <Typography>
                  <strong>Payment Link:</strong> <a href={booking.payments.stripePaymentLink} target="_blank" rel="noreferrer">Open</a>
                </Typography>
              </Grid>
            )}
            {typeof booking.payments?.depositAmount === 'number' && (
              <Grid item xs={12}>
                <Typography>
                  <strong>Deposit Status:</strong> {booking.payments?.depositStatus || (booking.depositPaid ? "paid" : "unpaid")}
                </Typography>
              </Grid>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        {!isEditing ? (
          <>
            <Button onClick={() => setShareOpen(true)} color="primary">
              Share Preorder
            </Button>
            <Button onClick={onDelete} color="error">
              Delete
            </Button>
            <Button onClick={() => setIsEditing(true)} color="primary">
              Edit
            </Button>
            <Button onClick={onClose} color="primary" variant="contained">
              Close
            </Button>
          </>
        ) : (
          <>
            <Button onClick={handleCancel} disabled={updating}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} color="primary" variant="contained" disabled={updating}>
              {updating ? "Updating..." : "Save Changes"}
            </Button>
          </>
        )}
      </DialogActions>
      <MuiDialog open={shareOpen} onClose={() => setShareOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Share Preorder</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>Send the preorder link to guests. Separate multiple emails with commas or spaces.</Typography>
          <TextField
            fullWidth
            label="Guest emails"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="name@example.com, other@example.com"
            sx={{ mb: 2 }}
          />
          <Typography variant="body2">Link:</Typography>
          <Typography variant="body2" sx={{ wordBreak: 'break-all', mb: 1 }}>{preorderLink}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareOpen(false)}>Cancel</Button>
          <Button onClick={handleSendLinks} disabled={sending} variant="contained">Send</Button>
        </DialogActions>
      </MuiDialog>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({...s, open:false}))}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({...s, open:false}))}>{snackbar.message}</Alert>
      </Snackbar>
    </Dialog>
  );
};

export default BookingDetails;
