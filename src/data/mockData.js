export const currentUser = {
  id: 'u1',
  name: 'Charles Wagner',
  role: 'Dispatcher',
  avatar: 'CW',
};

export const drivers = [
  { id: 'd1', name: 'Carlos Rivera', avatar: 'CR', status: 'available', truck: 'T-104', location: 'Dallas, TX' },
  { id: 'd2', name: 'Sarah Chen', avatar: 'SC', status: 'on-route', truck: 'T-207', location: 'Memphis, TN' },
  { id: 'd3', name: 'James Wilson', avatar: 'JW', status: 'available', truck: 'T-315', location: 'Atlanta, GA' },
  { id: 'd4', name: 'Priya Patel', avatar: 'PP', status: 'on-route', truck: 'T-422', location: 'Phoenix, AZ' },
  { id: 'd5', name: 'Tommy Lee', avatar: 'TL', status: 'off-duty', truck: 'T-518', location: 'Chicago, IL' },
  { id: 'd6', name: 'Maria Garcia', avatar: 'MG', status: 'available', truck: 'T-603', location: 'Denver, CO' },
  { id: 'd7', name: 'David Brown', avatar: 'DB', status: 'on-route', truck: 'T-711', location: 'Nashville, TN' },
  { id: 'd8', name: 'Aisha Khan', avatar: 'AK', status: 'available', truck: 'T-829', location: 'Houston, TX' },
];

export const initialMessages = [];

export const initialTimeOffRequests = [
  { id: 'to1', driverId: 'd5', driverName: 'Tommy Lee', startDate: '2026-06-25', endDate: '2026-06-27', reason: 'Family event', status: 'pending', submittedAt: '2026-06-22' },
  { id: 'to2', driverId: 'd1', driverName: 'Carlos Rivera', startDate: '2026-07-01', endDate: '2026-07-03', reason: 'Personal day', status: 'pending', submittedAt: '2026-06-23' },
  { id: 'to3', driverId: 'd8', driverName: 'Aisha Khan', startDate: '2026-06-28', endDate: '2026-06-30', reason: 'Medical appointment', status: 'approved', submittedAt: '2026-06-20' },
  { id: 'to4', driverId: 'd3', driverName: 'James Wilson', startDate: '2026-06-20', endDate: '2026-06-21', reason: 'Vacation', status: 'denied', submittedAt: '2026-06-15' },
];
