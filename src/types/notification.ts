export interface AppNotification {
  id: string;
  centerId: string;
  title: string;
  message: string;
  type: 'menu_approval' | 'info';
  targetUids: string[];
  readBy: string[];
  createdByUid: string;
  createdByName: string;
  actionTab: 'menu_planner' | 'stock' | 'daywise_shopping';
  planId?: string;
  createdAt: string;
}
