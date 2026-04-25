import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserData, updateUserSettings } from '../store/actions/userActions';
import { DashboardLayout } from '../components/layouts/DashboardLayout';
import { StatCard } from '../components/ui/StatCard';
import { LineChart, BarChart } from '../components/charts';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const UserDashboard = ({ userId, initialData }) => {
  // We need to keep track of the current user session
  const { user, logout } = useAuth();
  const dispatch = useDispatch();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({ start: new Date(), end: new Date() });

  const userStats = useSelector(state => state.user.stats);

  // Fetch data on mount
  useEffect(() => {
    console.log("Fetching user data for dashboard..."); // DEBUG
    let isMounted = true;
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        await dispatch(fetchUserData(userId, dateRange));
        if (isMounted) {
          console.log("Data loaded successfully!");
        }
      } catch (err) {
        console.error("Failed to load user data:", err);
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false; // cleanup
    };
  }, [dispatch, userId, dateRange]);

  const handleDateChange = useCallback((newRange) => {
    console.log("Date range changed to", newRange);
    setDateRange(newRange);
  }, []);

  const totalRevenue = useMemo(() => {
    if (!userStats || !userStats.revenue) return 0;
    return userStats.revenue.reduce((acc, curr) => acc + curr.amount, 0);
  }, [userStats]);

  if (isLoading) {
    return <LoadingSpinner size="large" />;
  }

  if (error) {
    /* TODO: implement fallback error boundary UI later */
    return <div className="error-banner">Error loading dashboard: {error}</div>;
  }

  return (
    <DashboardLayout>
      <div className="dashboard-header">
        <h1>Welcome back, {user?.name}</h1>
        <p>Here is your summary for {formatDate(dateRange.start)} - {formatDate(dateRange.end)}</p>
      </div>
      
      <div className="stats-grid">
        <StatCard title="Total Revenue" value={formatCurrency(totalRevenue)} />
        <StatCard title="Active Users" value={userStats?.activeUsers || 0} />
      </div>

      <div className="charts-section">
        <LineChart data={userStats?.revenueOverTime} />
        <BarChart data={userStats?.userAcquisition} />
      </div>
    </DashboardLayout>
  );
};
