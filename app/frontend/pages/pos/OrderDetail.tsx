import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PrintIcon from "@mui/icons-material/Print";
import EmailIcon from "@mui/icons-material/Email";
import ReceiptIcon from "@mui/icons-material/Receipt";
import EditIcon from "@mui/icons-material/Edit";
import { useCompany } from "../../../backend/context/CompanyContext";
import DataHeader from "../../components/reusable/DataHeader";


interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  modifiers?: string[];
}

interface Order {
  id: string;
  orderNumber: string;
  status: "completed" | "in-progress" | "cancelled";
  date: string;
  time: string;
  customer: {
    name: string;
    phone?: string;
    email?: string;
  };
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount?: {
    name: string;
    amount: number;
  };
  total: number;
  paymentMethod: string;
  notes?: string;
  employee: string;
}

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useCompany();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [openCancelDialog, setOpenCancelDialog] = useState(false);

  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Mock data for demonstration
  useEffect(() => {
    // In a real app, fetch order details from your database based on the ID
    const mockOrder: Order = {
      id: id || "123",
      orderNumber: "ORD-" + (id || "123"),
      status: "completed",
      date: "2023-10-15",
      time: "14:30:22",
      customer: {
        name: "John Smith",
        phone: "555-123-4567",
        email: "john.smith@example.com",
      },
      items: [
        {
          id: "1",
          name: "Cheeseburger",
          quantity: 2,
          unitPrice: 8.99,
          totalPrice: 17.98,
          modifiers: ["Extra cheese", "No onions"],
        },
        {
          id: "2",
          name: "French Fries",
          quantity: 1,
          unitPrice: 3.99,
          totalPrice: 3.99,
        },
        {
          id: "3",
          name: "Soda (Large)",
          quantity: 2,
          unitPrice: 2.49,
          totalPrice: 4.98,
        },
      ],
      subtotal: 26.95,
      tax: 2.16,
      discount: {
        name: "Lunch Special",
        amount: 3.0,
      },
      total: 26.11,
      paymentMethod: "Credit Card",
      employee: "Sarah Johnson",
    };

    setOrder(mockOrder);
    setLoading(false);
  }, [id]);

  const handleBack = () => {
    navigate("/POS/Orders");
  };

  const handlePrint = () => {
    // In a real app, implement print functionality
    console.log("Printing order:", order?.orderNumber);
  };

  const handleEmail = () => {
    // In a real app, implement email functionality
    console.log("Emailing receipt to:", order?.customer.email);
  };

  const handleEdit = () => {
    // In a real app, navigate to edit order page
    navigate(`/POS/OrdersEdit/${id}`);
  };

  const handleOpenCancelDialog = () => {
    setOpenCancelDialog(true);
  };

  const handleCloseCancelDialog = () => {
    setOpenCancelDialog(false);
  };

  const handleCancelOrder = () => {
    // In a real app, update order status in your database
    if (order) {
      setOrder({
        ...order,
        status: "cancelled",
      });
    }
    handleCloseCancelDialog();
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case "completed":
        return <Chip label="Completed" color="success" />;
      case "in-progress":
        return <Chip label="In Progress" color="primary" />;
      case "cancelled":
        return <Chip label="Cancelled" color="error" />;
      default:
        return <Chip label={status} />;
    }
  };

  // DataHeader handlers
  const sortOptions = [
    { value: 'name', label: 'Item Name' },
    { value: 'quantity', label: 'Quantity' },
    { value: 'unitPrice', label: 'Unit Price' },
    { value: 'totalPrice', label: 'Total Price' }
  ];

  const filteredAndSortedItems = order?.items
    ?.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    ?.sort((a, b) => {
      const aValue = a[sortBy as keyof OrderItem]
      const bValue = b[sortBy as keyof OrderItem]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }
      
      return 0
    }) || [];

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field);
    setSortDirection(direction);
  };

  const handleExport = () => {
    if (!order) return;
    
    const data = [
      {
        'Order Number': order.orderNumber,
        'Date': order.date,
        'Time': order.time,
        'Customer': order.customer.name,
        'Status': order.status,
        'Total': `$${order.total.toFixed(2)}`,
        'Payment Method': order.paymentMethod,
        'Employee': order.employee
      },
      ...filteredAndSortedItems.map(item => ({
        'Item': item.name,
        'Quantity': item.quantity,
        'Unit Price': `$${item.unitPrice.toFixed(2)}`,
        'Total': `$${item.totalPrice.toFixed(2)}`,
        'Notes': item.notes || 'N/A'
      }))
    ];
    
    const csvContent = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `order-${order.orderNumber}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Box p={3}>
        <Typography>Loading order details...</Typography>
      </Box>
    );
  }

  if (!order) {
    return (
      <Box p={3}>
        <Typography variant="h5" color="error">
          Order not found
        </Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          Back to Orders
        </Button>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <DataHeader
        title={`Order #${order.orderNumber}`}
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search order items..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport()}
        onExportPDF={() => handleExport()}
        additionalButtons={[
          {
            label: "Back to Orders",
            icon: <ArrowBackIcon />,
            onClick: handleBack,
            variant: 'outlined' as const
          },
          ...(order.status !== "cancelled" ? [
            {
              label: "Print",
              icon: <PrintIcon />,
              onClick: handlePrint,
              variant: 'outlined' as const
            },
            {
              label: "Email",
              icon: <EmailIcon />,
              onClick: handleEmail,
              variant: 'outlined' as const
            },
            ...(order.status !== "completed" ? [
              {
                label: "Edit",
                icon: <EditIcon />,
                onClick: handleEdit,
                variant: 'outlined' as const
              }
            ] : []),
            {
              label: "Cancel Order",
              icon: <EditIcon />,
              onClick: handleOpenCancelDialog,
              variant: 'outlined' as const,
              color: 'error' as const
            }
          ] : [])
        ]}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h6">Order Details</Typography>
              {getStatusChip(order.status)}
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Date
                </Typography>
                <Typography variant="body1">{order.date}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Time
                </Typography>
                <Typography variant="body1">{order.time}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Customer
                </Typography>
                <Typography variant="body1">{order.customer.name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Phone
                </Typography>
                <Typography variant="body1">
                  {order.customer.phone || "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Email
                </Typography>
                <Typography variant="body1">
                  {order.customer.email || "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Employee
                </Typography>
                <Typography variant="body1">{order.employee}</Typography>
              </Grid>
            </Grid>
          </Paper>

          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Items
            </Typography>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell align="center">Qty</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAndSortedItems.map((item) => (
                    <React.Fragment key={item.id}>
                      <TableRow>
                        <TableCell>
                          <Typography variant="body1">{item.name}</Typography>
                          {item.modifiers && item.modifiers.length > 0 && (
                            <Typography variant="caption" color="textSecondary">
                              {item.modifiers.join(", ")}
                            </Typography>
                          )}
                          {item.notes && (
                            <Typography
                              variant="caption"
                              color="textSecondary"
                              display="block"
                            >
                              Note: {item.notes}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">{item.quantity}</TableCell>
                        <TableCell align="right">
                          ${item.unitPrice.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          ${item.totalPrice.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <ReceiptIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Payment Summary</Typography>
              </Box>

              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body1">Subtotal:</Typography>
                <Typography variant="body1">
                  ${order.subtotal.toFixed(2)}
                </Typography>
              </Box>

              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body1">Tax:</Typography>
                <Typography variant="body1">${order.tax.toFixed(2)}</Typography>
              </Box>

              {order.discount && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body1">
                    Discount ({order.discount.name}):
                  </Typography>
                  <Typography variant="body1" color="error">
                    -${order.discount.amount.toFixed(2)}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6">${order.total.toFixed(2)}</Typography>
              </Box>

              <Box display="flex" justifyContent="space-between" mt={2}>
                <Typography variant="body2" color="textSecondary">
                  Payment Method:
                </Typography>
                <Typography variant="body1">{order.paymentMethod}</Typography>
              </Box>
            </CardContent>
          </Card>

          {order.notes && (
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Order Notes
                </Typography>
                <Typography variant="body1">{order.notes}</Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      <Dialog open={openCancelDialog} onClose={handleCloseCancelDialog}>
        <DialogTitle>Cancel Order</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel this order? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancelDialog}>No, Keep Order</Button>
          <Button onClick={handleCancelOrder} color="error" variant="contained">
            Yes, Cancel Order
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderDetail;
