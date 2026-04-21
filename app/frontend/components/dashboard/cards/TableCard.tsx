import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  TextField,
  InputAdornment,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  // FilterList as FilterListIcon, // TODO: Implement filter functionality
} from '@mui/icons-material';
import { AnalyticsResult } from '../../../../backend/functions/Analytics';
import EmptyCardState from './EmptyCardState';

interface TableCardProps {
  title: string;
  data: AnalyticsResult;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onMenuClick?: () => void;
  onDownload?: () => void;
  color?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  maxRows?: number;
}

const TableCard: React.FC<TableCardProps> = ({
  title,
  data,
  loading = false,
  error = null,
  onRefresh,
  onMenuClick,
  onDownload,
  color,
  size = 'medium',
  maxRows = 10
}) => {
  const theme = useTheme();
  const accent = color ?? theme.palette.primary.main;
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(maxRows);
  const [orderBy, setOrderBy] = useState<string>('');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');

  const rows = Array.isArray((data as any)?.data) ? (data as any).data : [];
  const hasRows = rows.length > 0;
  const summary = (data as any)?.summary ?? {
    count: rows.length,
    average: 0,
    min: 0,
    max: 0,
    total: 0,
  };

  const getCardHeight = () => {
    switch (size) {
      case 'small':
        return 300;
      case 'large':
        return 500;
      default:
        return 400;
    }
  };

  const getTableHeight = () => {
    switch (size) {
      case 'small':
        return 200;
      case 'large':
        return 400;
      default:
        return 300;
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const filteredData = rows.filter((item: any) => {
    if (!searchTerm) return true;
    return JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase());
  });

  const sortedData = filteredData.sort((a: any, b: any) => {
    if (!orderBy) return 0;
    
    const aValue = a[orderBy];
    const bValue = b[orderBy];
    
    if (aValue < bValue) {
      return order === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return order === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const paginatedData = sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const getValueDisplay = (value: any) => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const getColumns = () => {
    if (!hasRows) return [];
    const firstItem = rows[0];
    return Object.keys(firstItem).map((key) => ({
      id: key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      sortable: true,
    }));
  };

  if (error) {
    return (
      <Card sx={{ height: getCardHeight() }}>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card sx={{ height: getCardHeight() }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  const columns = getColumns();

  return (
    <Card sx={{ height: getCardHeight(), borderLeft: `4px solid ${accent}` }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h3" color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {onRefresh && (
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={onRefresh}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            )}
            {onDownload && (
              <Tooltip title="Download">
                <IconButton size="small" onClick={onDownload}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            )}
            {onMenuClick && (
              <Tooltip title="More options">
                <IconButton size="small" onClick={onMenuClick}>
                  <MoreVertIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {hasRows ? (
          <>
            <Box sx={{ mb: 2 }}>
              <TextField
                size="small"
                placeholder="Search data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: '100%' }}
              />
            </Box>

            <TableContainer sx={{ height: getTableHeight() }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        sortDirection={orderBy === column.id ? order : false}
                        sx={{ backgroundColor: theme.palette.background.paper }}
                      >
                        <TableSortLabel
                          active={orderBy === column.id}
                          direction={orderBy === column.id ? order : 'asc'}
                          onClick={() => handleSort(column.id)}
                        >
                          {column.label}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.map((row, index) => (
                    <TableRow key={index} hover>
                      {columns.map((column) => (
                        <TableCell key={column.id}>
                          {getValueDisplay((row as any)[column.id])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredData.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label={`Total: ${Number(summary.count) || 0}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={`Average: ${Number(summary.average ?? 0).toFixed(2)}`}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              </Box>
              <Typography variant="caption" color="textSecondary">
                Showing {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, filteredData.length)} of {filteredData.length}
              </Typography>
            </Box>
          </>
        ) : (
          <EmptyCardState message="No table data available" height={getTableHeight() + 56} />
        )}
      </CardContent>
    </Card>
  );
};

export default TableCard;
