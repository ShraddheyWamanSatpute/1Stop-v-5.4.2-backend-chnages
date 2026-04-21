"use client"

import type React from "react"
import { useState } from "react"
import { Box, Typography, Tabs, Tab } from "@mui/material"
import { ViewPermission } from "../../components/company/PermissionFilter"
import {
  Receipt as ReceiptIcon,
  RestaurantMenu as RestaurantMenuIcon,
  PointOfSale as PointOfSaleIcon,
  Settings as SettingsIcon,
  LocalOffer as DiscountIcon,
  Payment as PaymentIcon,
  Devices as DevicesIcon,
  Category as CategoryIcon,
  LocationOn as LocationIcon,
  ViewModule as GroupsIcon,
  Description as BillsIcon,
  Map as FloorPlanIcon,
  ShoppingCart as PromotionsIcon,
} from "@mui/icons-material"

// Import components for each tab
import OrdersTable from "../../components/pos/OrdersTable"
import MenuItemsTable from "../../components/pos/MenuItemsTable"
import TillScreensTable from "../../components/pos/TillScreensTable"
import DeviceManagement from "./DeviceManagement"
import PaymentManagement from "./PaymentManagement"
import LocationManagement from "./LocationManagement"
import GroupManagement from "./GroupManagement"
import BillsManagement from "./BillsManagement"
import FloorPlanManagement from "./FloorPlanManagement"
import PromotionsManagement from "./PromotionsManagement"
import POSSettingsTable from "../../components/pos/POSSettingsTable"
import DiscountsManagement from "./DiscountsManagement"
import DataHeader from "../../components/reusable/DataHeader"
import { CategoriesManagement } from "@/frontend/components/stock"

// Placeholder component for Till Usage
const TillUsage = () => <Typography p={3}>Till Usage - Coming Soon</Typography>

const POSManagement = () => {
  const [activeTab, setActiveTab] = useState(0)

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  return (
    <Box sx={{ p: 3 }}>
      <DataHeader
        showDateControls={false}
        searchTerm=""
        onSearchChange={() => {}}
        searchPlaceholder="Search..."
        sortOptions={[]}
        sortValue=""
        sortDirection="asc"
        onSortChange={() => {}}
        onExportCSV={() => {}}
        onExportPDF={() => {}}
        additionalButtons={[]}
      />

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          "& .MuiTab-root": {
            minWidth: 120,
          },
        }}
      >
        <ViewPermission module="pos" page="orders">
          <Tab icon={<ReceiptIcon />} label="Orders" />
        </ViewPermission>
        <ViewPermission module="pos" page="items">
          <Tab icon={<RestaurantMenuIcon />} label="Menu Items" />
        </ViewPermission>
        <ViewPermission module="pos" page="tillscreens">
          <Tab icon={<PointOfSaleIcon />} label="Till Screens" />
        </ViewPermission>
        <ViewPermission module="pos" page="bills">
          <Tab icon={<BillsIcon />} label="Bills" />
        </ViewPermission>
        <ViewPermission module="pos" page="floorplan">
          <Tab icon={<FloorPlanIcon />} label="Floor Plan" />
        </ViewPermission>
        <ViewPermission module="pos" page="devices">
          <Tab icon={<DevicesIcon />} label="Devices" />
        </ViewPermission>
        <ViewPermission module="pos" page="locations">
          <Tab icon={<LocationIcon />} label="Locations" />
        </ViewPermission>
        <ViewPermission module="pos" page="payments">
          <Tab icon={<PaymentIcon />} label="Payments" />
        </ViewPermission>
        <ViewPermission module="pos" page="discounts">
          <Tab icon={<DiscountIcon />} label="Discounts" />
        </ViewPermission>
        <ViewPermission module="pos" page="promotions">
          <Tab icon={<PromotionsIcon />} label="Promotions" />
        </ViewPermission>
        <ViewPermission module="pos" page="groups">
          <Tab icon={<GroupsIcon />} label="Groups" />
        </ViewPermission>
        <ViewPermission module="pos" page="categories">
          <Tab icon={<CategoryIcon />} label="Categories" />
        </ViewPermission>
        <ViewPermission module="pos" page="settings">
          <Tab icon={<SettingsIcon />} label="Settings" />
        </ViewPermission>
        <ViewPermission module="pos" page="tillusage">
          <Tab icon={<PointOfSaleIcon />} label="Till Usage" />
        </ViewPermission>
      </Tabs>

      <Box sx={{ p: 2 }}>
          {activeTab === 0 && <OrdersTable />}
          {activeTab === 1 && <MenuItemsTable />}
          {activeTab === 2 && <TillScreensTable />}
          {activeTab === 3 && <BillsManagement />}
          {activeTab === 4 && <FloorPlanManagement />}
          {activeTab === 5 && <DeviceManagement />}
          {activeTab === 6 && <LocationManagement />}
          {activeTab === 7 && <PaymentManagement />}
          {activeTab === 8 && <DiscountsManagement />}
          {activeTab === 9 && <PromotionsManagement />}
          {activeTab === 10 && <GroupManagement />}
          {activeTab === 11 && <CategoriesManagement />}
          {activeTab === 12 && (
            <POSSettingsTable
              title="POS Settings"
              data={[]}
              columns={[
                { id: "name", label: "Setting", minWidth: 200 },
                { id: "value", label: "Value", minWidth: 150 },
                { id: "description", label: "Description", minWidth: 300 },
              ]}
            />
          )}
          {activeTab === 13 && <TillUsage />}
      </Box>
    </Box>
  )
}

export default POSManagement
