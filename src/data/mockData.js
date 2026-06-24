export const currentUser = {
  id: 'u1',
  name: 'Mike Johnson',
  role: 'Dispatcher',
  avatar: 'MJ',
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

export const initialSchedule = [
  { id: 's1', driverId: 'd1', driverName: 'Carlos Rivera', loadNumber: 'LD-4821', origin: 'Dallas, TX', destination: 'Oklahoma City, OK', date: '2026-06-24', time: '11:00', status: 'assigned' },
  { id: 's2', driverId: 'd2', driverName: 'Sarah Chen', loadNumber: 'LD-4822', origin: 'Memphis, TN', destination: 'Little Rock, AR', date: '2026-06-24', time: '06:00', status: 'in-transit' },
  { id: 's3', driverId: 'd3', driverName: 'James Wilson', loadNumber: 'LD-4823', origin: 'Atlanta, GA', destination: 'Charlotte, NC', date: '2026-06-24', time: '14:00', status: 'assigned' },
  { id: 's4', driverId: 'd4', driverName: 'Priya Patel', loadNumber: 'LD-4824', origin: 'Phoenix, AZ', destination: 'Las Vegas, NV', date: '2026-06-24', time: '08:00', status: 'in-transit' },
  { id: 's5', driverId: 'd7', driverName: 'David Brown', loadNumber: 'LD-4825', origin: 'Nashville, TN', destination: 'Louisville, KY', date: '2026-06-24', time: '07:30', status: 'in-transit' },
  { id: 's6', driverId: 'd6', driverName: 'Maria Garcia', loadNumber: 'LD-4826', origin: 'Denver, CO', destination: 'Salt Lake City, UT', date: '2026-06-25', time: '05:00', status: 'assigned' },
  { id: 's7', driverId: 'd8', driverName: 'Aisha Khan', loadNumber: 'LD-4827', origin: 'Houston, TX', destination: 'San Antonio, TX', date: '2026-06-25', time: '09:00', status: 'assigned' },
  { id: 's8', driverId: 'd1', driverName: 'Carlos Rivera', loadNumber: 'LD-4828', origin: 'Oklahoma City, OK', destination: 'Kansas City, MO', date: '2026-06-25', time: '06:00', status: 'pending' },
  { id: 's9', driverId: 'd3', driverName: 'James Wilson', loadNumber: 'LD-4829', origin: 'Charlotte, NC', destination: 'Atlanta, GA', date: '2026-06-25', time: '10:00', status: 'pending' },
];

export const initialTimeOffRequests = [
  { id: 'to1', driverId: 'd5', driverName: 'Tommy Lee', startDate: '2026-06-25', endDate: '2026-06-27', reason: 'Family event', status: 'pending', submittedAt: '2026-06-22' },
  { id: 'to2', driverId: 'd1', driverName: 'Carlos Rivera', startDate: '2026-07-01', endDate: '2026-07-03', reason: 'Personal day', status: 'pending', submittedAt: '2026-06-23' },
  { id: 'to3', driverId: 'd8', driverName: 'Aisha Khan', startDate: '2026-06-28', endDate: '2026-06-30', reason: 'Medical appointment', status: 'approved', submittedAt: '2026-06-20' },
  { id: 'to4', driverId: 'd3', driverName: 'James Wilson', startDate: '2026-06-20', endDate: '2026-06-21', reason: 'Vacation', status: 'denied', submittedAt: '2026-06-15' },
];
