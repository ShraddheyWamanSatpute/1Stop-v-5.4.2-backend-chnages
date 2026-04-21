"use client"

import React, { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Chip,
  Checkbox,
  FormControlLabel,
  Divider,
  Tabs,
  Tab,
  Autocomplete,
} from '@mui/material'
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  AccountBalance as AccountIcon,
  Receipt as ReceiptIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  AccountBalanceWallet as BankIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useFinance } from '../../../../backend/context/FinanceContext'
import type { Contact, Account, TaxRate, Currency } from '../../../../backend/interfaces/Finance'

interface ContactFormProps {
  contact?: Contact | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  )
}

const ContactForm: React.FC<ContactFormProps> = ({
  contact,
  mode,
  onSave
}) => {
  const { state: financeState } = useFinance()
  const [activeTab, setActiveTab] = useState(0)

  const [formData, setFormData] = useState({
    name: '',
    type: 'customer' as Contact['type'],
    companyName: '',
    firstName: '',
    lastName: '',
    contactPerson: '',
    email: '',
    phone: '',
    mobile: '',
    website: '',
    // Address
    addressStreet: '',
    addressCity: '',
    addressState: '',
    addressPostalCode: '',
    addressCountry: '',
    // Billing Address
    billingAddressStreet: '',
    billingAddressCity: '',
    billingAddressState: '',
    billingAddressPostalCode: '',
    billingAddressCountry: '',
    // Shipping Address
    shippingAddressStreet: '',
    shippingAddressCity: '',
    shippingAddressState: '',
    shippingAddressPostalCode: '',
    shippingAddressCountry: '',
    // Tax & Legal
    taxNumber: '',
    vatNumber: '',
    // Financial
    paymentTerms: 30,
    creditLimit: 0,
    discount: 0,
    currency: 'GBP',
    defaultAccountId: '',
    defaultTaxRateId: '',
    // Bank Details
    bankAccountName: '',
    bankAccountNumber: '',
    bankSortCode: '',
    bankIban: '',
    bankSwiftCode: '',
    bankName: '',
    // Status
    isActive: true,
    isArchived: false,
    // Notes
    notes: '',
    tags: [] as string[],
  })

  // Update form data when contact prop changes
  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || '',
        type: contact.type || 'customer',
        companyName: contact.companyName || '',
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        contactPerson: contact.contactPerson || '',
        email: contact.email || '',
        phone: contact.phone || '',
        mobile: contact.mobile || '',
        website: contact.website || '',
        addressStreet: contact.address?.street || '',
        addressCity: contact.address?.city || '',
        addressState: contact.address?.state || '',
        addressPostalCode: contact.address?.postalCode || '',
        addressCountry: contact.address?.country || '',
        billingAddressStreet: contact.billingAddress?.street || '',
        billingAddressCity: contact.billingAddress?.city || '',
        billingAddressState: contact.billingAddress?.state || '',
        billingAddressPostalCode: contact.billingAddress?.postalCode || '',
        billingAddressCountry: contact.billingAddress?.country || '',
        shippingAddressStreet: contact.shippingAddress?.street || '',
        shippingAddressCity: contact.shippingAddress?.city || '',
        shippingAddressState: contact.shippingAddress?.state || '',
        shippingAddressPostalCode: contact.shippingAddress?.postalCode || '',
        shippingAddressCountry: contact.shippingAddress?.country || '',
        taxNumber: contact.taxNumber || '',
        vatNumber: contact.vatNumber || '',
        paymentTerms: contact.paymentTerms || 30,
        creditLimit: contact.creditLimit || 0,
        discount: contact.discount || 0,
        currency: contact.currency || 'GBP',
        defaultAccountId: contact.defaultAccountId || '',
        defaultTaxRateId: contact.defaultTaxRateId || '',
        bankAccountName: contact.bankDetails?.accountName || '',
        bankAccountNumber: contact.bankDetails?.accountNumber || '',
        bankSortCode: contact.bankDetails?.sortCode || '',
        bankIban: contact.bankDetails?.iban || '',
        bankSwiftCode: contact.bankDetails?.swiftCode || '',
        bankName: contact.bankDetails?.bankName || '',
        isActive: contact.isActive !== false,
        isArchived: contact.isArchived || false,
        notes: contact.notes || '',
        tags: contact.tags || [],
      })
    }
  }, [contact])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = () => {
    if (!formData.name || !formData.email) {
      alert('Please fill in required fields: Name and Email')
      return
    }

    const submissionData: Partial<Contact> = {
      name: formData.name,
      type: formData.type,
      companyName: formData.companyName || undefined,
      firstName: formData.firstName || undefined,
      lastName: formData.lastName || undefined,
      contactPerson: formData.contactPerson || undefined,
      email: formData.email,
      phone: formData.phone || undefined,
      mobile: formData.mobile || undefined,
      website: formData.website || undefined,
      address: (formData.addressStreet || formData.addressCity) ? {
        street: formData.addressStreet,
        city: formData.addressCity,
        state: formData.addressState,
        postalCode: formData.addressPostalCode,
        country: formData.addressCountry,
      } : undefined,
      billingAddress: (formData.billingAddressStreet || formData.billingAddressCity) ? {
        street: formData.billingAddressStreet,
        city: formData.billingAddressCity,
        state: formData.billingAddressState,
        postalCode: formData.billingAddressPostalCode,
        country: formData.billingAddressCountry,
      } : undefined,
      shippingAddress: (formData.shippingAddressStreet || formData.shippingAddressCity) ? {
        street: formData.shippingAddressStreet,
        city: formData.shippingAddressCity,
        state: formData.shippingAddressState,
        postalCode: formData.shippingAddressPostalCode,
        country: formData.shippingAddressCountry,
      } : undefined,
      taxNumber: formData.taxNumber || undefined,
      vatNumber: formData.vatNumber || undefined,
      paymentTerms: formData.paymentTerms,
      creditLimit: formData.creditLimit || undefined,
      discount: formData.discount || undefined,
      currency: formData.currency,
      defaultAccountId: formData.defaultAccountId || undefined,
      defaultTaxRateId: formData.defaultTaxRateId || undefined,
      bankDetails: (formData.bankAccountNumber || formData.bankIban) ? {
        accountName: formData.bankAccountName || undefined,
        accountNumber: formData.bankAccountNumber || undefined,
        sortCode: formData.bankSortCode || undefined,
        iban: formData.bankIban || undefined,
        swiftCode: formData.bankSwiftCode || undefined,
        bankName: formData.bankName || undefined,
      } : undefined,
      isActive: formData.isActive,
      isArchived: formData.isArchived,
      notes: formData.notes || undefined,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      createdAt: contact?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    onSave(submissionData)
  }

  const isReadOnly = mode === 'view'

  const accounts = financeState.accounts || []
  const taxRates = financeState.taxRates || []
  const currencies = financeState.currencies?.length > 0 ? financeState.currencies : [
    { code: 'GBP', name: 'British Pound', symbol: '£', rate: 1, isBase: true, lastUpdated: new Date().toISOString(), status: 'active' as const },
    { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1, isBase: false, lastUpdated: new Date().toISOString(), status: 'active' as const },
    { code: 'EUR', name: 'Euro', symbol: '€', rate: 1, isBase: false, lastUpdated: new Date().toISOString(), status: 'active' as const },
  ]

  return (
    <Box sx={{ width: '100%' }}>
      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
        <Tab icon={<PersonIcon />} label="Basic Info" />
        <Tab icon={<LocationIcon />} label="Addresses" />
        <Tab icon={<AccountIcon />} label="Financial" />
        <Tab icon={<BankIcon />} label="Bank Details" />
      </Tabs>

      <TabPanel value={activeTab} index={0}>
        <FormSection title="Contact Information" icon={<PersonIcon />}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name *"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required disabled={isReadOnly}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  label="Type"
                >
                  <MenuItem value="customer">Customer</MenuItem>
                  <MenuItem value="supplier">Supplier</MenuItem>
                  <MenuItem value="both">Customer & Supplier</MenuItem>
                  <MenuItem value="employee">Employee</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Company Name"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contact Person"
                value={formData.contactPerson}
                onChange={(e) => handleChange('contactPerson', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email *"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Mobile"
                value={formData.mobile}
                onChange={(e) => handleChange('mobile', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Website"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                disabled={isReadOnly}
                placeholder="https://"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tax Number"
                value={formData.taxNumber}
                onChange={(e) => handleChange('taxNumber', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="VAT Number"
                value={formData.vatNumber}
                onChange={(e) => handleChange('vatNumber', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isActive}
                    onChange={(e) => handleChange('isActive', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Active"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isArchived}
                    onChange={(e) => handleChange('isArchived', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Archived"
                sx={{ ml: 2 }}
              />
            </Grid>
          </Grid>
        </FormSection>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <FormSection title="Primary Address" icon={<LocationIcon />}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Street Address"
                value={formData.addressStreet}
                onChange={(e) => handleChange('addressStreet', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="City"
                value={formData.addressCity}
                onChange={(e) => handleChange('addressCity', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="State/Province"
                value={formData.addressState}
                onChange={(e) => handleChange('addressState', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Postal Code"
                value={formData.addressPostalCode}
                onChange={(e) => handleChange('addressPostalCode', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Country"
                value={formData.addressCountry}
                onChange={(e) => handleChange('addressCountry', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
          </Grid>
        </FormSection>

        <FormSection title="Billing Address" icon={<ReceiptIcon />}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!formData.billingAddressStreet && !formData.billingAddressCity}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Copy from primary address
                        handleChange('billingAddressStreet', formData.addressStreet)
                        handleChange('billingAddressCity', formData.addressCity)
                        handleChange('billingAddressState', formData.addressState)
                        handleChange('billingAddressPostalCode', formData.addressPostalCode)
                        handleChange('billingAddressCountry', formData.addressCountry)
                      }
                    }}
                    disabled={isReadOnly}
                  />
                }
                label="Same as primary address"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Street Address"
                value={formData.billingAddressStreet}
                onChange={(e) => handleChange('billingAddressStreet', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="City"
                value={formData.billingAddressCity}
                onChange={(e) => handleChange('billingAddressCity', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="State/Province"
                value={formData.billingAddressState}
                onChange={(e) => handleChange('billingAddressState', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Postal Code"
                value={formData.billingAddressPostalCode}
                onChange={(e) => handleChange('billingAddressPostalCode', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Country"
                value={formData.billingAddressCountry}
                onChange={(e) => handleChange('billingAddressCountry', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
          </Grid>
        </FormSection>

        <FormSection title="Shipping Address" icon={<LocationIcon />}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!formData.shippingAddressStreet && !formData.shippingAddressCity}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Copy from primary address
                        handleChange('shippingAddressStreet', formData.addressStreet)
                        handleChange('shippingAddressCity', formData.addressCity)
                        handleChange('shippingAddressState', formData.addressState)
                        handleChange('shippingAddressPostalCode', formData.addressPostalCode)
                        handleChange('shippingAddressCountry', formData.addressCountry)
                      }
                    }}
                    disabled={isReadOnly}
                  />
                }
                label="Same as primary address"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Street Address"
                value={formData.shippingAddressStreet}
                onChange={(e) => handleChange('shippingAddressStreet', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="City"
                value={formData.shippingAddressCity}
                onChange={(e) => handleChange('shippingAddressCity', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="State/Province"
                value={formData.shippingAddressState}
                onChange={(e) => handleChange('shippingAddressState', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Postal Code"
                value={formData.shippingAddressPostalCode}
                onChange={(e) => handleChange('shippingAddressPostalCode', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Country"
                value={formData.shippingAddressCountry}
                onChange={(e) => handleChange('shippingAddressCountry', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
          </Grid>
        </FormSection>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <FormSection title="Financial Settings" icon={<AccountIcon />}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Payment Terms (days)"
                type="number"
                value={formData.paymentTerms}
                onChange={(e) => handleChange('paymentTerms', parseInt(e.target.value) || 0)}
                disabled={isReadOnly}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={formData.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  label="Currency"
                >
                  {currencies.map((curr) => (
                    <MenuItem key={curr.code} value={curr.code}>
                      {curr.code} - {curr.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Credit Limit"
                type="number"
                value={formData.creditLimit}
                onChange={(e) => handleChange('creditLimit', parseFloat(e.target.value) || 0)}
                disabled={isReadOnly}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Discount (%)"
                type="number"
                value={formData.discount}
                onChange={(e) => handleChange('discount', parseFloat(e.target.value) || 0)}
                disabled={isReadOnly}
                inputProps={{ min: 0, max: 100, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Default Account</InputLabel>
                <Select
                  value={formData.defaultAccountId}
                  onChange={(e) => handleChange('defaultAccountId', e.target.value)}
                  label="Default Account"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {accounts.map((acc) => (
                    <MenuItem key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Default Tax Rate</InputLabel>
                <Select
                  value={formData.defaultTaxRateId}
                  onChange={(e) => handleChange('defaultTaxRateId', e.target.value)}
                  label="Default Tax Rate"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {taxRates.map((tax) => (
                    <MenuItem key={tax.id} value={tax.id}>
                      {tax.name} ({tax.rate}%)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </FormSection>
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <FormSection title="Bank Details" icon={<BankIcon />}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Bank Name"
                value={formData.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Account Name"
                value={formData.bankAccountName}
                onChange={(e) => handleChange('bankAccountName', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Account Number"
                value={formData.bankAccountNumber}
                onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Sort Code"
                value={formData.bankSortCode}
                onChange={(e) => handleChange('bankSortCode', e.target.value)}
                disabled={isReadOnly}
                placeholder="XX-XX-XX"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="IBAN"
                value={formData.bankIban}
                onChange={(e) => handleChange('bankIban', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="SWIFT Code"
                value={formData.bankSwiftCode}
                onChange={(e) => handleChange('bankSwiftCode', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>
          </Grid>
        </FormSection>
      </TabPanel>

      {!isReadOnly && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              padding: '12px 24px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {mode === 'edit' ? 'Update Contact' : 'Create Contact'}
          </button>
        </Box>
      )}
    </Box>
  )
}

export default ContactForm
