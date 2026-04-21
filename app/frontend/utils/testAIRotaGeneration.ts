/**
 * Test utility to verify AI rota generation improvements
 */

export interface TestEmployee {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  department?: string;
  roleId?: string;
  availabilityDays?: string;
  availabilityHours?: string;
  hoursPerWeek?: number;
  isFullTime?: boolean;
}

export interface TestSchedule {
  employeeId: string;
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  role: string;
  notes: string;
}

/**
 * Test the employee filtering logic
 */
export function testEmployeeFiltering(employees: TestEmployee[]): {
  totalEmployees: number;
  activeEmployees: TestEmployee[];
  filteredOutEmployees: TestEmployee[];
  filteringResults: Array<{
    name: string;
    status: string;
    isActive: boolean;
    reason: string;
  }>;
} {
  const activeEmployees: TestEmployee[] = [];
  const filteredOutEmployees: TestEmployee[] = [];
  const filteringResults: Array<{
    name: string;
    status: string;
    isActive: boolean;
    reason: string;
  }> = [];

  employees.forEach(emp => {
    // Apply the new filtering logic
    const isActive = emp.status !== "inactive" && emp.status !== "terminated" && emp.status !== "suspended";
    
    const result = {
      name: `${emp.firstName} ${emp.lastName}`,
      status: emp.status,
      isActive,
      reason: isActive ? 'Included - Active status' : `Excluded - Status: ${emp.status}`
    };
    
    filteringResults.push(result);
    
    if (isActive) {
      activeEmployees.push(emp);
    } else {
      filteredOutEmployees.push(emp);
    }
  });

  return {
    totalEmployees: employees.length,
    activeEmployees,
    filteredOutEmployees,
    filteringResults
  };
}

/**
 * Test the staffing calculation logic
 */
export function testStaffingCalculation(activeEmployees: TestEmployee[]): {
  minStaffPerDay: number;
  maxEmployeesPerDay: number;
  minSuggestionsForWeek: number;
  expectedTotalShifts: number;
} {
  const employeeCount = activeEmployees.length;
  
  // Apply the new staffing calculation logic
  const avgHistoricalStaffPerDay = 0; // Assume no historical data
  const avgBookingsPerDay = 0; // Assume no bookings data
  
  const minStaffPerDay = Math.max(3, Math.min(Math.ceil(employeeCount * 0.7), Math.round(avgHistoricalStaffPerDay || avgBookingsPerDay * 0.3 || Math.ceil(employeeCount * 0.5))));
  
  const maxEmployeesPerDay = Math.min(employeeCount, Math.max(3, Math.ceil(employeeCount * 0.6)));
  
  const minSuggestionsForWeek = Math.max(employeeCount * 2, minStaffPerDay * 5);
  
  const expectedTotalShifts = Math.min(minSuggestionsForWeek, employeeCount * 5); // Max 5 shifts per employee per week
  
  return {
    minStaffPerDay,
    maxEmployeesPerDay,
    minSuggestionsForWeek,
    expectedTotalShifts
  };
}

/**
 * Analyze generated rota results
 */
export function analyzeRotaResults(schedules: TestSchedule[], employees: TestEmployee[]): {
  totalShifts: number;
  employeesScheduled: number;
  employeesNotScheduled: string[];
  shiftsPerEmployee: Record<string, number>;
  averageShiftsPerEmployee: number;
  daysWithCoverage: number;
  averageStaffPerDay: number;
  recommendations: string[];
} {
  const employeesScheduled = new Set(schedules.map(s => s.employeeId));
  const employeesNotScheduled = employees
    .filter(emp => !employeesScheduled.has(emp.id))
    .map(emp => `${emp.firstName} ${emp.lastName} (${emp.status})`);
  
  const shiftsPerEmployee: Record<string, number> = {};
  schedules.forEach(schedule => {
    shiftsPerEmployee[schedule.employeeId] = (shiftsPerEmployee[schedule.employeeId] || 0) + 1;
  });
  
  const averageShiftsPerEmployee = schedules.length / Math.max(employeesScheduled.size, 1);
  
  // Analyze daily coverage
  const shiftsByDate: Record<string, number> = {};
  schedules.forEach(schedule => {
    shiftsByDate[schedule.date] = (shiftsByDate[schedule.date] || 0) + 1;
  });
  
  const daysWithCoverage = Object.keys(shiftsByDate).length;
  const averageStaffPerDay = schedules.length / Math.max(daysWithCoverage, 1);
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (employeesNotScheduled.length > employees.length * 0.3) {
    recommendations.push(`⚠️ ${employeesNotScheduled.length} employees not scheduled (${Math.round(employeesNotScheduled.length / employees.length * 100)}% of total)`);
  }
  
  if (averageShiftsPerEmployee < 2) {
    recommendations.push(`⚠️ Low average shifts per employee: ${averageShiftsPerEmployee.toFixed(1)} (target: 2-3)`);
  }
  
  if (daysWithCoverage < 5) {
    recommendations.push(`⚠️ Only ${daysWithCoverage} days have coverage (target: 5-7 days)`);
  }
  
  if (averageStaffPerDay < 3) {
    recommendations.push(`⚠️ Low average staff per day: ${averageStaffPerDay.toFixed(1)} (target: 3+)`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push("✅ Rota generation looks good!");
  }
  
  return {
    totalShifts: schedules.length,
    employeesScheduled: employeesScheduled.size,
    employeesNotScheduled,
    shiftsPerEmployee,
    averageShiftsPerEmployee,
    daysWithCoverage,
    averageStaffPerDay,
    recommendations
  };
}

/**
 * Run a complete test of the AI rota generation logic
 */
export function runRotaGenerationTest(employees: TestEmployee[], generatedSchedules: TestSchedule[]): {
  filteringTest: ReturnType<typeof testEmployeeFiltering>;
  staffingTest: ReturnType<typeof testStaffingCalculation>;
  resultsAnalysis: ReturnType<typeof analyzeRotaResults>;
  summary: {
    success: boolean;
    issues: string[];
    improvements: string[];
  };
} {
  const filteringTest = testEmployeeFiltering(employees);
  const staffingTest = testStaffingCalculation(filteringTest.activeEmployees);
  const resultsAnalysis = analyzeRotaResults(generatedSchedules, filteringTest.activeEmployees);
  
  const issues: string[] = [];
  const improvements: string[] = [];
  
  // Check if filtering is working correctly
  if (filteringTest.activeEmployees.length < employees.length * 0.7) {
    issues.push(`Too many employees filtered out: ${filteringTest.filteredOutEmployees.length}/${employees.length}`);
  } else {
    improvements.push(`Good employee inclusion: ${filteringTest.activeEmployees.length}/${employees.length} active`);
  }
  
  // Check if enough shifts are generated
  if (resultsAnalysis.totalShifts < staffingTest.minSuggestionsForWeek * 0.8) {
    issues.push(`Insufficient shifts generated: ${resultsAnalysis.totalShifts} (target: ${staffingTest.minSuggestionsForWeek})`);
  } else {
    improvements.push(`Good shift coverage: ${resultsAnalysis.totalShifts} shifts generated`);
  }
  
  // Check employee distribution
  if (resultsAnalysis.employeesScheduled < filteringTest.activeEmployees.length * 0.8) {
    issues.push(`Too few employees scheduled: ${resultsAnalysis.employeesScheduled}/${filteringTest.activeEmployees.length}`);
  } else {
    improvements.push(`Good employee distribution: ${resultsAnalysis.employeesScheduled}/${filteringTest.activeEmployees.length} scheduled`);
  }
  
  return {
    filteringTest,
    staffingTest,
    resultsAnalysis,
    summary: {
      success: issues.length === 0,
      issues,
      improvements
    }
  };
}

/**
 * Console logging helper for test results
 */
export function logTestResults(testResults: ReturnType<typeof runRotaGenerationTest>): void {
  console.log("🧪 AI Rota Generation Test Results:");
  console.log("=====================================");
  
  console.log("\n📊 Employee Filtering:");
  console.log(`Total Employees: ${testResults.filteringTest.totalEmployees}`);
  console.log(`Active Employees: ${testResults.filteringTest.activeEmployees.length}`);
  console.log(`Filtered Out: ${testResults.filteringTest.filteredOutEmployees.length}`);
  
  console.log("\n📈 Staffing Calculations:");
  console.log(`Min Staff Per Day: ${testResults.staffingTest.minStaffPerDay}`);
  console.log(`Max Employees Per Day: ${testResults.staffingTest.maxEmployeesPerDay}`);
  console.log(`Min Suggestions For Week: ${testResults.staffingTest.minSuggestionsForWeek}`);
  
  console.log("\n📋 Results Analysis:");
  console.log(`Total Shifts Generated: ${testResults.resultsAnalysis.totalShifts}`);
  console.log(`Employees Scheduled: ${testResults.resultsAnalysis.employeesScheduled}`);
  console.log(`Average Shifts Per Employee: ${testResults.resultsAnalysis.averageShiftsPerEmployee.toFixed(1)}`);
  console.log(`Days With Coverage: ${testResults.resultsAnalysis.daysWithCoverage}`);
  
  console.log("\n🎯 Summary:");
  console.log(`Success: ${testResults.summary.success ? '✅' : '❌'}`);
  
  if (testResults.summary.improvements.length > 0) {
    console.log("\n✅ Improvements:");
    testResults.summary.improvements.forEach(improvement => console.log(`  ${improvement}`));
  }
  
  if (testResults.summary.issues.length > 0) {
    console.log("\n⚠️ Issues:");
    testResults.summary.issues.forEach(issue => console.log(`  ${issue}`));
  }
  
  if (testResults.resultsAnalysis.employeesNotScheduled.length > 0) {
    console.log("\n👥 Employees Not Scheduled:");
    testResults.resultsAnalysis.employeesNotScheduled.forEach(emp => console.log(`  ${emp}`));
  }
  
  console.log("\n💡 Recommendations:");
  testResults.resultsAnalysis.recommendations.forEach(rec => console.log(`  ${rec}`));
}
