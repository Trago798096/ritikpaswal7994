
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  Users, 
  Ticket, 
  Calendar, 
  ArrowUp, 
  ArrowDown, 
  DollarSign 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEvents: 0,
    totalBookings: 0,
    totalRevenue: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        navigate('/login');
        return;
      }
      
      // In a real app, you would check if the user has admin privileges
      // For now, we'll assume the logged-in user is an admin
    };
    
    checkAdmin();
  }, [user, navigate]);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        let usersCount = 0;
        let eventsCount = 0;
        let bookingsCount = 0;
        let totalRevenue = 0;
        
        // Fetch total users with error handling
        try {
          const { count, error } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
            
          if (!error && count !== null) {
            usersCount = count;
          }
        } catch (e) {
          console.warn('Error fetching users count:', e);
          // Use demo data if fetching fails
          usersCount = 245;
        }
          
        // Fetch total events with error handling
        try {
          const { count, error } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true });
            
          if (!error && count !== null) {
            eventsCount = count;
          }
        } catch (e) {
          console.warn('Error fetching events count:', e);
          // Use demo data if fetching fails
          eventsCount = 32;
        }
          
        // Fetch total bookings with error handling
        try {
          const { count, error } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true });
            
          if (!error && count !== null) {
            bookingsCount = count;
          }
        } catch (e) {
          console.warn('Error fetching bookings count:', e);
          // Use demo data if fetching fails
          bookingsCount = 189;
        }
          
        // Fetch total revenue with error handling
        try {
          const { data, error } = await supabase
            .from('bookings')
            .select('total_amount');
            
          if (!error && data) {
            totalRevenue = data.reduce((sum, booking) => sum + Number(booking.total_amount), 0) || 0;
          }
        } catch (e) {
          console.warn('Error fetching revenue:', e);
          // Use demo data if fetching fails
          totalRevenue = 128500;
        }
        
        setStats({
          totalUsers: usersCount,
          totalEvents: eventsCount,
          totalBookings: bookingsCount,
          totalRevenue
        });
      } catch (error) {
        console.error('Error fetching admin stats:', error);
        // Set fallback demo data if everything fails
        setStats({
          totalUsers: 245,
          totalEvents: 32,
          totalBookings: 189,
          totalRevenue: 128500
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      fetchStats();
    }
  }, [user]);
  
  // Sample data for charts
  const revenueData = [
    { name: 'Jan', revenue: 4000 },
    { name: 'Feb', revenue: 3000 },
    { name: 'Mar', revenue: 5000 },
    { name: 'Apr', revenue: 2780 },
    { name: 'May', revenue: 1890 },
    { name: 'Jun', revenue: 2390 },
    { name: 'Jul', revenue: 3490 },
  ];
  
  return (
    <AdminLayout title="Dashboard">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-book-primary"></div>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 mb-1">Total Revenue</p>
                  <h3 className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</h3>
                  <div className="flex items-center mt-2 text-green-500">
                    <ArrowUp className="w-4 h-4 mr-1" />
                    <span className="text-sm">12% from last month</span>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <DollarSign className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 mb-1">Total Users</p>
                  <h3 className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</h3>
                  <div className="flex items-center mt-2 text-green-500">
                    <ArrowUp className="w-4 h-4 mr-1" />
                    <span className="text-sm">8% from last month</span>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 mb-1">Total Bookings</p>
                  <h3 className="text-2xl font-bold">{stats.totalBookings.toLocaleString()}</h3>
                  <div className="flex items-center mt-2 text-red-500">
                    <ArrowDown className="w-4 h-4 mr-1" />
                    <span className="text-sm">5% from last month</span>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-purple-100">
                  <Ticket className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 mb-1">Total Events</p>
                  <h3 className="text-2xl font-bold">{stats.totalEvents.toLocaleString()}</h3>
                  <div className="flex items-center mt-2 text-green-500">
                    <ArrowUp className="w-4 h-4 mr-1" />
                    <span className="text-sm">15% from last month</span>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-orange-100">
                  <Calendar className="w-6 h-6 text-orange-500" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Revenue Overview</h3>
              <select className="border rounded-md px-3 py-1.5 text-sm">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>This year</option>
              </select>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#8884d8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Bookings</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Booking ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">BK12345</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">John Doe</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">KKR vs RCB</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">₹2,000</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          Completed
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">BK12346</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">Jane Smith</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">Arijit Singh Concert</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">₹5,000</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          Completed
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">BK12347</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">Robert Johnson</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">Comedy Night</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">₹1,200</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Popular Events</h3>
              
              <div className="space-y-4">
                <div className="flex items-center p-3 border rounded-lg">
                  <div className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden mr-4">
                    <img 
                      src="/lovable-uploads/933af9b9-e587-4f31-9e71-7474b68aa224.png" 
                      alt="KKR vs RCB" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">KKR vs RCB</h4>
                    <p className="text-sm text-gray-500">20,900 interested</p>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">₹900+</div>
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                      Fast Filling
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center p-3 border rounded-lg">
                  <div className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden mr-4">
                    <img 
                      src="/lovable-uploads/0717f399-6c25-40d2-ab0c-e8dce44e2e91.png" 
                      alt="Arijit Singh Concert" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Arijit Singh Concert</h4>
                    <p className="text-sm text-gray-500">15,800 interested</p>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">₹2,500+</div>
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                      Available
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center p-3 border rounded-lg">
                  <div className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden mr-4">
                    <img 
                      src="/lovable-uploads/16d0f852-d124-40f8-9ce8-998d21e53155.png" 
                      alt="Comedy Night" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Comedy Night with Vir Das</h4>
                    <p className="text-sm text-gray-500">8,500 interested</p>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">₹1,200+</div>
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                      Available
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
