import { analyzeHRData, generateBusinessReport } from '../services/VertexService';

/**
 * Test Vertex AI integration with sample data
 */
export async function testVertexAI() {
  console.log('🧠 Testing Vertex AI Integration...');
  
  try {
    // Sample HR data for testing
    const sampleHRData = {
      employees: [
        { id: '1', name: 'John Doe', department: 'Sales', role: 'Manager', salary: 50000, status: 'active' },
        { id: '2', name: 'Jane Smith', department: 'Marketing', role: 'Specialist', salary: 45000, status: 'active' },
        { id: '3', name: 'Bob Johnson', department: 'Sales', role: 'Representative', salary: 40000, status: 'active' }
      ],
      attendance: [
        { employeeId: '1', date: '2024-01-15', hoursWorked: 8, status: 'present' },
        { employeeId: '2', date: '2024-01-15', hoursWorked: 7.5, status: 'present' },
        { employeeId: '3', date: '2024-01-15', hoursWorked: 0, status: 'absent' }
      ],
      performance: [
        { employeeId: '1', rating: 4.5, period: '2024-Q1' },
        { employeeId: '2', rating: 4.2, period: '2024-Q1' },
        { employeeId: '3', rating: 3.8, period: '2024-Q1' }
      ]
    };

    console.log('📊 Analyzing HR data with Vertex AI...');
    const hrAnalysis = await analyzeHRData(sampleHRData);
    
    console.log('✅ HR Analysis Result:');
    console.log(hrAnalysis);

    // Test business report generation
    console.log('📈 Generating business report...');
    const businessReport = await generateBusinessReport(
      'Analyze employee performance and provide recommendations for improving productivity',
      sampleHRData
    );
    
    console.log('✅ Business Report Result:');
    console.log(businessReport);

    return {
      success: true,
      hrAnalysis,
      businessReport
    };

  } catch (error) {
    console.error('❌ Vertex AI Test Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test subsite-specific AI analysis with comprehensive data
 */
export async function testSubsiteAnalysis() {
  console.log('🏢 Testing Subsite-Specific AI Analysis...');
  
  try {
    // Mock comprehensive subsite data structure
    const mockSubsiteData = {
      timestamp: new Date().toISOString(),
      context: {
        companyId: 'comp-123',
        companyName: 'Test Restaurant Group',
        siteId: 'site-456',
        siteName: 'Downtown Location',
        subsiteId: 'subsite-789',
        subsiteName: 'Main Dining Room',
        userId: 'user-abc',
        userName: 'John Manager',
        userEmail: 'john@testrestaurant.com',
      },
      modules: {
        hr: {
          employees: [
            { id: '1', name: 'Alice Server', role: 'Server', department: 'Front of House', shift: 'Evening' },
            { id: '2', name: 'Bob Cook', role: 'Cook', department: 'Kitchen', shift: 'Day' }
          ],
          attendance: [
            { employeeId: '1', date: '2024-01-15', hoursWorked: 8, status: 'present' },
            { employeeId: '2', date: '2024-01-15', hoursWorked: 8, status: 'present' }
          ]
        },
        bookings: {
          bookings: [
            { id: '1', date: '2024-01-15', time: '19:00', guests: 4, table: 'T1', status: 'confirmed' },
            { id: '2', date: '2024-01-15', time: '20:00', guests: 2, table: 'T2', status: 'seated' }
          ],
          tables: [
            { id: 'T1', name: 'Table 1', capacity: 4, location: 'Window' },
            { id: 'T2', name: 'Table 2', capacity: 2, location: 'Center' }
          ]
        },
        stock: {
          products: [
            { id: '1', name: 'Salmon Fillet', category: 'Fish', stock: 15, minStock: 10, cost: 12.50 },
            { id: '2', name: 'Chicken Breast', category: 'Poultry', stock: 8, minStock: 12, cost: 8.00 }
          ]
        }
      },
      metadata: {
        dataScope: 'subsite',
        hierarchyLevel: 3,
        modulesWithData: ['hr', 'bookings', 'stock'],
        totalDataPoints: 8
      },
      organizationStructure: {
        company: { id: 'comp-123', name: 'Test Restaurant Group' },
        site: { id: 'site-456', name: 'Downtown Location', description: 'Main downtown restaurant' },
        subsite: { id: 'subsite-789', name: 'Main Dining Room', description: 'Primary dining area' },
        allSites: [
          { id: 'site-456', name: 'Downtown Location', subsiteCount: 3 },
          { id: 'site-457', name: 'Uptown Location', subsiteCount: 2 }
        ]
      }
    };

    const { generateBusinessReport } = await import('../services/VertexService');
    
    console.log('📊 Generating subsite-specific analysis...');
    const analysis = await generateBusinessReport(
      'Analyze the performance of this specific dining room location. Focus on staff efficiency, table utilization, inventory management, and provide actionable recommendations for improving operations in this particular subsite.',
      mockSubsiteData
    );
    
    console.log('✅ Subsite Analysis Result:');
    console.log(analysis);

    return {
      success: true,
      analysis,
      dataContext: mockSubsiteData.context
    };

  } catch (error) {
    console.error('❌ Subsite Analysis Test Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Quick test function for development
 */
export async function quickVertexTest() {
  const result = await testVertexAI();
  if (result.success) {
    console.log('🎉 Vertex AI is working correctly!');
  } else {
    console.log('⚠️ Vertex AI test failed:', result.error);
  }
  return result;
}
