import React, { Suspense } from 'react';
import { createRouter, createRoute, createRootRoute, Outlet, Navigate } from '@tanstack/react-router';
import { queryClient } from './queryClient';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Layout components - không lazy load vì cần thiết cho structure
import RootLayout from '../components/layout/RootLayout';
import AuthLayout from '../components/layout/AuthLayout';
import DashboardLayout from '../components/layout/DashboardLayout';
import UserLayout from '../components/layout/UserLayout';

// Lazy load các page components để code splitting
const LoginPage = React.lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = React.lazy(() => import('../pages/auth/RegisterPage'));
const LogoutPage = React.lazy(() => import('../pages/auth/LogoutPage'));
const DashboardHome = React.lazy(() => import('../pages/dashboard/DashboardHome'));
const UserProfile = React.lazy(() => import('../pages/dashboard/UserProfile'));
const ScoreHistory = React.lazy(() => import('../pages/dashboard/ScoreHistory'));
const ExerciseList = React.lazy(() => import('../pages/exercises/ExerciseList'));
const ExerciseDetail = React.lazy(() => import('../pages/exercises/ExerciseDetail'));
const UserList = React.lazy(() => import('../pages/users/UserList'));
const UserManagement = React.lazy(() => import('../pages/users/UserManagement'));
const ExerciseManagement = React.lazy(() => import('../pages/exercises/ExerciseManagement'));
const LeaderboardPage = React.lazy(() => import('../pages/public/LeaderboardPage'));

// Higher-order component để wrap lazy components với Suspense
const withSuspense = (Component: React.LazyExoticComponent<React.ComponentType<any>>) => {
  return (props: any) => 
    React.createElement(
      Suspense,
      { fallback: React.createElement(LoadingSpinner) },
      React.createElement(Component, props)
    );
};

// Root route
const rootRoute = createRootRoute({
  component: () => {
    return React.createElement(RootLayout, null, React.createElement(Outlet));
  },
});

// Auth routes
const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth',
  component: () => {
    return React.createElement(AuthLayout, null, React.createElement(Outlet));
  },
});

const loginRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/login',
  component: withSuspense(LoginPage),
});

const registerRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/register',
  component: withSuspense(RegisterPage),
});

const logoutRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/logout',
  component: withSuspense(LogoutPage),
});

// Dashboard routes
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: () => {
    return React.createElement(DashboardLayout, null, React.createElement(Outlet));
  },
});

const dashboardIndexRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/',
  component: withSuspense(DashboardHome),
});

const userProfileRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/profile',
  component: withSuspense(UserProfile),
});

const scoreHistoryRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/scores',
  component: withSuspense(ScoreHistory),
});

// Exercise routes
const exercisesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/exercises',
  component: () => {
    return React.createElement(DashboardLayout, null, React.createElement(Outlet));
  },
});

const exerciseListRoute = createRoute({
  getParentRoute: () => exercisesRoute,
  path: '/',
  component: withSuspense(ExerciseList),
});

const exerciseDetailRoute = createRoute({
  getParentRoute: () => exercisesRoute,
  path: '/$exerciseId',
  component: withSuspense(ExerciseDetail),
});

// Users routes (Admin only)
const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users',
  component: () => {
    return React.createElement(UserLayout, null, React.createElement(Outlet));
  },
});

const userListRoute = createRoute({
  getParentRoute: () => usersRoute,
  path: '/',
  component: withSuspense(UserList),
});

const userManagementRoute = createRoute({
  getParentRoute: () => usersRoute,
  path: '/management',
  component: withSuspense(UserManagement),
});

const exerciseManagementRoute = createRoute({
  getParentRoute: () => exercisesRoute,
  path: '/management',
  component: withSuspense(ExerciseManagement),
});

// Public routes (không cần authentication)
const leaderboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leaderboard',
  component: withSuspense(LeaderboardPage),
});

// Home route (redirect to dashboard)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => {
    return React.createElement(Navigate, { to: '/dashboard' });
  },
});

// Route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  leaderboardRoute,
  authRoute.addChildren([
    loginRoute,
    registerRoute,
    logoutRoute,
  ]),
  dashboardRoute.addChildren([
    dashboardIndexRoute,
    userProfileRoute,
    scoreHistoryRoute,
  ]),
  exercisesRoute.addChildren([
    exerciseListRoute,
    exerciseDetailRoute,
    exerciseManagementRoute
  ]),
  usersRoute.addChildren([
    userListRoute,
    userManagementRoute,
  ]),
]);

// Tạo router instance
export const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreload: 'intent',
  // Preload delay để tối ưu performance
  defaultPreloadDelay: 100,
});

// Declare router type để có type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}