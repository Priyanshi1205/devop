import { create } from 'zustand';

export interface Project {
  id: string;
  name: string;
  description?: string;
}

export interface Website {
  id: string;
  domain: string;
  projectId: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  subscription?: {
    plan: string;
    status: string;
    trialEndDate: string;
    paid: boolean;
  } | null;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

interface AppState {
  user: User | null;
  token: string | null;
  projects: Project[];
  websites: Website[];
  currentProject: Project | null;
  currentWebsite: Website | null;
  notifications: Notification[];
  isLoggedIn: boolean;
  
  // Actions
  login: (user: User, token: string) => void;
  logout: () => void;
  setProjects: (projects: Project[]) => void;
  setWebsites: (websites: Website[]) => void;
  setCurrentProject: (project: Project) => void;
  setCurrentWebsite: (website: Website) => void;
  addProject: (project: Project) => void;
  addWebsite: (website: Website) => void;
  addNotification: (title: string, message: string) => void;
  markAllNotificationsRead: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  token: null,
  isLoggedIn: false, // Wait for localStorage or auto-login on mount
  projects: [],
  websites: [],
  currentProject: null,
  currentWebsite: null,
  notifications: [],

  login: (user, token) => set({ user, token, isLoggedIn: true }),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lastLoggedInEmail');
    }
    return set({ user: null, token: null, isLoggedIn: false, currentProject: null, currentWebsite: null });
  },
  setProjects: (projects) => set({ projects, currentProject: projects[0] || null }),
  setWebsites: (websites) => set({ websites, currentWebsite: websites[0] || null }),
  setCurrentProject: (currentProject) => set({ currentProject }),
  setCurrentWebsite: (currentWebsite) => set({ currentWebsite }),
  
  addProject: (project) => set((state) => ({ 
    projects: [...state.projects, project],
    currentProject: state.currentProject ? state.currentProject : project 
  })),
  
  addWebsite: (website) => set((state) => ({ 
    websites: [...state.websites, website],
    currentWebsite: state.currentWebsite ? state.currentWebsite : website 
  })),

  addNotification: (title, message) => set((state) => ({
    notifications: [
      {
        id: `not-${Math.random().toString(36).substring(7)}`,
        title,
        message,
        read: false,
        createdAt: new Date(),
      },
      ...state.notifications,
    ],
  })),

  markAllNotificationsRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ ...n, read: true })),
  })),
}));

// Subscribe to store changes to keep localStorage in sync
if (typeof window !== 'undefined') {
  useStore.subscribe((state) => {
    if (state.token) {
      localStorage.setItem('accessToken', state.token);
    } else {
      localStorage.removeItem('accessToken');
    }
    if (state.user) {
      localStorage.setItem('user', JSON.stringify(state.user));
      localStorage.setItem('lastLoggedInEmail', state.user.email);
    } else {
      localStorage.removeItem('user');
    }
  });
}

// Monkey-patch window.fetch for automatic JWT token injection, rotation, and errors intercepting
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async function (url, options = {}) {
    const urlString = url.toString();
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
    const isApiRequest = API_BASE_URL !== '' && urlString.startsWith(API_BASE_URL) && !urlString.includes('/auth/');

    if (isApiRequest) {
      options.headers = options.headers || {};
      const token = useStore.getState().token;

      if (token && token !== 'mock-jwt-token-xyz') {
        if (options.headers instanceof Headers) {
          options.headers.set('Authorization', `Bearer ${token}`);
        } else if (Array.isArray(options.headers)) {
          const idx = options.headers.findIndex(([k]) => k.toLowerCase() === 'authorization');
          if (idx !== -1) {
            options.headers[idx][1] = `Bearer ${token}`;
          } else {
            options.headers.push(['Authorization', `Bearer ${token}`]);
          }
        } else {
          options.headers['Authorization'] = `Bearer ${token}`;
        }
      }
      options.credentials = 'include';
    }

    let response;
    try {
      response = await originalFetch(url, options);
    } catch (err) {
      console.error('Fetch network error:', err);
      throw err;
    }

    if (response.status === 401 && isApiRequest) {
      console.warn('Access token unauthorized or expired (401). Attempting token rotation...');
      try {
        const refreshRes = await originalFetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newAccessToken = refreshData.accessToken;
          console.log('Token rotated successfully.');

          useStore.setState({ token: newAccessToken });

          // Retry the original request with the new access token
          if (!options.headers) {
            options.headers = {};
          }
          if (options.headers instanceof Headers) {
            options.headers.set('Authorization', `Bearer ${newAccessToken}`);
          } else if (Array.isArray(options.headers)) {
            const idx = options.headers.findIndex(([k]) => k.toLowerCase() === 'authorization');
            if (idx !== -1) {
              options.headers[idx][1] = `Bearer ${newAccessToken}`;
            } else {
              options.headers.push(['Authorization', `Bearer ${newAccessToken}`]);
            }
          } else {
            (options.headers as any)['Authorization'] = `Bearer ${newAccessToken}`;
          }

          response = await originalFetch(url, options);
        } else {
          console.error('Refresh token expired or invalid. Redirecting to login.');
          useStore.setState({ token: null, isLoggedIn: false, user: null });
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      } catch (err) {
        console.error('Error during token refresh:', err);
        useStore.setState({ token: null, isLoggedIn: false, user: null });
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return response;
  };
}
