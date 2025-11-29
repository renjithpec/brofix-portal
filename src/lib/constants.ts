export const BRANCHES = [
  'Bengaluru',
  'Calicut', 
  'Chennai',
  'Coimbatore',
  'Kochi',
  'Trivandrum'
] as const;

export type Branch = typeof BRANCHES[number];

export const CATEGORIES = [
  'WiFi',
  'Food',
  'Cleanliness',
  'Academics',
  'Other'
] as const;

export type Category = typeof CATEGORIES[number];

export const STATUSES = ['Open', 'In_Progress', 'Resolved'] as const;
export type Status = typeof STATUSES[number];

export const SUPER_ADMIN_EMAIL = 'admin.kochi@brototype.com';

export const getCategoryClass = (category: Category): string => {
  const classes: Record<Category, string> = {
    WiFi: 'category-wifi',
    Food: 'category-food',
    Cleanliness: 'category-cleanliness',
    Academics: 'category-academics',
    Other: 'category-other'
  };
  return classes[category];
};

export const getStatusClass = (status: Status): string => {
  const classes: Record<Status, string> = {
    Open: 'status-open',
    In_Progress: 'status-in-progress',
    Resolved: 'status-resolved'
  };
  return classes[status];
};

export const getStatusLabel = (status: Status): string => {
  const labels: Record<Status, string> = {
    Open: 'Open',
    In_Progress: 'In Progress',
    Resolved: 'Resolved'
  };
  return labels[status];
};
