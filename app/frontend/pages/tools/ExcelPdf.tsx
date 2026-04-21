"use client"

import { themeConfig } from "../../../theme/AppTheme";
import { Box, Typography, Grid, Card, CardContent, CardActionArea, Button } from "@mui/material"
import { useNavigate } from "react-router-dom"
import { PictureAsPdf as PdfIcon, TableChart as ExcelIcon, Transform as TransformIcon, Calculate as CalculatorIcon } from "@mui/icons-material"
import { useCalculator } from "../../../backend/context/CalculatorContext"

const ExcelPdf = () => {
  const navigate = useNavigate()
  const { openCalculator } = useCalculator()

  const toolOptions = [
    {
      title: "PDF to Excel",
      description: "Convert PDF documents to Excel spreadsheets with data extraction",
      icon: <PdfIcon sx={{ fontSize: 48, color: themeConfig.brandColors.navy }} />,
      path: "/Tools/PdfToExcel",
    },
    {
      title: "Excel to PDF",
      description: "Convert Excel spreadsheets to PDF documents with formatting",
      icon: <ExcelIcon sx={{ fontSize: 48, color: themeConfig.brandColors.navy }} />,
      path: "/Tools/ExcelToPdf",
    },
    {
      title: "Excel Reformat",
      description: "Restructure Excel data from grouped format to single-line records",
      icon: <TransformIcon sx={{ fontSize: 48, color: themeConfig.brandColors.navy }} />,
      path: "/Tools/ExcelReformat",
    },
  ]

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Excel & PDF Tools
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Convert between Excel and PDF formats, and restructure your data
      </Typography>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<CalculatorIcon />}
          onClick={openCalculator}
        >
          Open Calculator
        </Button>
      </Box>

      <Grid container spacing={3}>
        {toolOptions.map((option) => (
          <Grid item xs={12} sm={6} md={4} key={option.title}>
            <Card sx={{ height: "100%" }}>
              <CardActionArea 
                onClick={() => navigate(option.path)} 
                sx={{ height: "100%", p: 3 }}
                tabIndex={0} // Explicitly set tabIndex
                aria-label={`${option.title}: ${option.description}`} // Add descriptive aria-label
              >
                <CardContent sx={{ textAlign: "center" }}>
                  {option.icon}
                  <Typography variant="h6" component="h2" sx={{ mt: 2, mb: 1 }}>
                    {option.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {option.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

export default ExcelPdf
