import React, { useState, useEffect } from "react";
import { useCompany } from "../../../backend/context/CompanyContext";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  Grid,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { db, ref, get } from "../../../backend/services/Firebase";
import type { ExtendedCompany } from "../../../backend/interfaces/Company";

const AdminClients: React.FC = () => {
  const { state: companyState } = useCompany();
  const [allCompanies, setAllCompanies] = useState<ExtendedCompany[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<ExtendedCompany[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllCompanies();
  }, []);

  useEffect(() => {
    filterCompanies();
  }, [searchTerm, allCompanies]);

  const loadAllCompanies = async () => {
    try {
      setLoading(true);
      const companiesRef = ref(db, "companies");
      const snapshot = await get(companiesRef);

      if (snapshot.exists()) {
        const companiesData = snapshot.val();
        const companiesArray = Object.keys(companiesData).map((id) => ({
          ...companiesData[id],
          companyID: id,
        }));
        setAllCompanies(companiesArray);
        setFilteredCompanies(companiesArray);
      }
    } catch (error) {
      console.error("Error loading companies:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterCompanies = () => {
    if (!searchTerm) {
      setFilteredCompanies(allCompanies);
      return;
    }

    const filtered = allCompanies.filter(
      (company) =>
        company.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.companyEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.companyType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.companyIndustry?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCompanies(filtered);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        All Clients
      </Typography>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Search companies by name, email, type, or industry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Company Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Industry</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      Loading companies...
                    </TableCell>
                  </TableRow>
                ) : filteredCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary">
                        {searchTerm
                          ? "No companies found matching your search"
                          : "No companies found"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompanies.map((company) => (
                    <TableRow key={company.companyID}>
                      <TableCell>
                        <Typography variant="body1" fontWeight="medium">
                          {company.companyName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={company.companyType || "N/A"}
                          size="small"
                          color={
                            company.companyType === "hospitality"
                              ? "primary"
                              : company.companyType === "supplier"
                              ? "secondary"
                              : "default"
                          }
                        />
                      </TableCell>
                      <TableCell>{company.companyIndustry || "N/A"}</TableCell>
                      <TableCell>{company.companyEmail || "N/A"}</TableCell>
                      <TableCell>{company.companyPhone || "N/A"}</TableCell>
                      <TableCell>
                        <Chip
                          label={company.companyStatus || "active"}
                          size="small"
                          color={
                            company.companyStatus === "active"
                              ? "success"
                              : "default"
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {company.companyCreated
                          ? new Date(company.companyCreated).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {!loading && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {filteredCompanies.length} of {allCompanies.length} companies
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminClients;
