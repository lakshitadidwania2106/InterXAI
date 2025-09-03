import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

<<<<<<< HEAD
const FloatingNavbar = ({ viewerType: propViewerType }) => {
=======
const Header = ({ viewerType: propViewerType }) => {
>>>>>>> d393f5b251e26c62d54d632e73c2579decf28f48
  const navigate = useNavigate();
  const location = useLocation();

  const [viewerType, setViewerType] = useState('guest');
  const [orgId, setOrgId] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);

  const token = localStorage.getItem('authToken');

  const isOrgDashboardPage = location.pathname.startsWith('/org-dashboard');
  const isOrgRegisterPage = location.pathname === '/register-org';
  const isDefaultPage = ['/', '/login', '/signup', '/about'].includes(location.pathname);
const baseUrl=import.meta.env.VITE_API_URL;
  useEffect(() => {
    if (!token) {
      setViewerType('guest');
    } else if (propViewerType === 'owner') {
      setViewerType('owner');
    } else {
      setViewerType('authenticated');
    }

    if (token) {
      // Check profile
      fetch(`${baseUrl}/users/get-id/`, {
        headers: { Authorization: `Token ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) setHasProfile(true);
        })
        .catch(() => setHasProfile(false));

      // Check organization
      fetch(`${baseUrl}/organization/get-org-id/`, {
        headers: { Authorization: `Token ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.organization_id) {
            setOrgId(data.organization_id);
          } else {
            setOrgId(null); // gracefully handle non-org users
          }
        })
        .catch(() => setOrgId(null));
    }
  }, [location.pathname, propViewerType, token]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setViewerType('guest');
    navigate('/login');
  };

  const handleBackToProfile = async () => {
    try {
      const res = await fetch(`${baseUrl}/users/get-id/`, {
        headers: { Authorization: `Token ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        navigate(`/profile/${data.profile_id}`);
      }
    } catch (err) {
      console.error("Error navigating to profile:", err);
    }
  };

  return (
    <div className="w-full flex justify-center pt-8 px-6">
      <nav className="flex items-center justify-between px-12 py-6 bg-white/95 backdrop-blur-xl rounded-full shadow-xl border border-gray-200/50 max-w-7xl w-full">
        <div className="flex items-center space-x-4">
          <div className="flex relative">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full shadow-lg"></div>
            <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full -ml-4 shadow-lg"></div>
          </div>
          <span className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            InterXAI
          </span>
        </div>

        <div className="flex items-center space-x-12">
          <a href="/" className="text-lg text-gray-700 hover:text-blue-600 font-semibold transition-colors duration-200 hover:scale-105 transform">
            Features
          </a>

          <a href="/about" className="text-lg text-gray-700 hover:text-blue-600 font-semibold transition-colors duration-200 hover:scale-105 transform">
            How It Works
          </a>

          <a href="/resources" className="text-lg text-gray-700 hover:text-blue-600 font-semibold transition-colors duration-200 hover:scale-105 transform">
            Resources
          </a>

          {/* -------- OWNER -------- */}
          {viewerType === 'owner' && (
            <>
              {isOrgDashboardPage ? (
                <>
                  <button
                    onClick={handleBackToProfile}
                    className="text-lg text-gray-700 hover:text-blue-600 font-semibold transition-colors duration-200 hover:scale-105 transform"
                  >
                    Back to Profile
                  </button>
                  <a
                    href="/interview"
                    className="text-lg text-gray-700 hover:text-blue-600 font-semibold transition-colors duration-200 hover:scale-105 transform"
                  >
                    Set Interview
                  </a>
                </>
              ) : orgId ? (
                <a
                  href={`/org-dashboard/${orgId}`}
                  className="text-lg text-gray-700 hover:text-blue-600 font-semibold transition-colors duration-200 hover:scale-105 transform"
                >
                  Go to Organization
                </a>
              ) : (
                <a
                  href="/register-org"
                  className="text-lg text-gray-700 hover:text-blue-600 font-semibold transition-colors duration-200 hover:scale-105 transform"
                >
                  Register as Organization
                </a>
              )}
            </>
          )}

          {/* -------- AUTHENTICATED -------- */}
          {viewerType === 'authenticated' && hasProfile && (
            <>
              {(isOrgDashboardPage || isOrgRegisterPage) ? (
                <button
                  onClick={handleBackToProfile}
                  className="text-lg text-gray-700 hover:text-blue-600 font-semibold transition-colors duration-200 hover:scale-105 transform"
                >
                  Back to Profile
                </button>
              ) : orgId ? (
                <a
                  href={`/org-dashboard/${orgId}`}
                  className="text-lg text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200 hover:scale-105 transform"
                >
                  Go to Organization
                </a>
              ) : (
                <a
                  href="/register-org"
                  className="text-lg text-gray-700 hover:text-blue-600 font-semibold transition-colors duration-200 hover:scale-105 transform"
                >
                  Register as Organization
                </a>
              )}
            </>
          )}

          {/* -------- GUEST -------- */}
          {viewerType === 'guest' && (
            <>
              <a href="/login" className="text-lg text-gray-700 hover:text-blue-600 font-semibold transition-colors duration-200 hover:scale-105 transform">
                Login
              </a>
            </>
          )}

          {/* Logout button for authenticated users */}
          {(viewerType === 'owner' || (viewerType === 'authenticated' && hasProfile)) && (
            <button 
              onClick={handleLogout} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 transform"
            >
              Logout
            </button>
          )}

          {/* Sign up button for guests */}
          {viewerType === 'guest' && (
            <a 
              href="/signup" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 transform"
            >
              Sign Up
            </a>
          )}
        </div>
      </nav>
    </div>
  );
};

<<<<<<< HEAD
export default FloatingNavbar;
=======
export default Header;
>>>>>>> d393f5b251e26c62d54d632e73c2579decf28f48
