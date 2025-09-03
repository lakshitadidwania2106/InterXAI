"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/ui/header";
import Footer from "../components/ui/footer";
import { useNavigate } from "react-router-dom";
import {
  Trophy,
  Medal,
  Award,
  User,
  Calendar,
  Clock,
  TrendingUp,
  Eye,
  FileText,
  Download,
  ArrowLeft,
  Star,
  BookOpen,
  Briefcase,
  GraduationCap,
  Code,
  Award as AwardIcon,
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { getAuthToken } from "../utils/handleToken";

const Leaderboard = () => {
  const { id: interviewId } = useParams();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showApplication, setShowApplication] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [resumeView, setResumeView] = useState('extracted'); // 'extracted' or 'original'
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetchLeaderboardData();
    setTimeout(() => setVisible(true), 100);
  }, [interviewId]);

  const fetchLeaderboardData = async () => {
    try {
      const token = getAuthToken();
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(
        `${API_URL}/interview/leaderboard/${interviewId}/`,
        {
          method: "GET",
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard data");
      }

      const data = await response.json();
      console.log(data);
      setLeaderboardData(Array.isArray(data) ? data : data.data || []);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-500" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <span className="w-6 h-6 flex items-center justify-center text-gray-600 font-bold">
            {rank}
          </span>
        );
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    if (score >= 40) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      completed: "bg-green-50 text-green-600 border-green-200",
      ongoing: "bg-blue-50 text-blue-600 border-blue-200",
      scheduled: "bg-gray-50 text-gray-600 border-gray-200",
      cancelled: "bg-red-50 text-red-600 border-red-200",
      cheated: "bg-red-50 text-red-600 border-red-200",
    };

    const colorClass = statusColors[status] || "bg-gray-50 text-gray-600 border-gray-200";

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium border ${colorClass}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getDecisionBadge = (decision) => {
    if (decision === true) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium border bg-green-50 text-green-600 border-green-200 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Approved
        </span>
      );
    } else if (decision === false) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium border bg-red-50 text-red-600 border-red-200 flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium border bg-yellow-50 text-yellow-600 border-yellow-200 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Pending
        </span>
      );
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleViewDetails = (candidate) => {
    setSelectedCandidate(candidate);
    setShowHistory(true);
  };

  const handleViewApplication = (application) => {
    setSelectedApplication(application);
    setShowApplication(true);
    setResumeView('extracted');
  };

  const parseExtractedResume = (resumeText) => {
    if (!resumeText) return null;
    
    const sections = {
      personalDetails: [],
      skills: [],
      experience: [],
      education: [],
      certifications: [],
      projects: [],
      achievements: []
    };
  
    const lines = resumeText.split('\n');
    let currentSection = '';
  
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('### Personal Details')) {
        currentSection = 'personalDetails';
      } else if (trimmedLine.startsWith('### Skills')) {
        currentSection = 'skills';
      } else if (trimmedLine.startsWith('### Experience')) {
        currentSection = 'experience';
      } else if (trimmedLine.startsWith('### Education')) {
        currentSection = 'education';
      } else if (trimmedLine.startsWith('### Certifications')) {
        currentSection = 'certifications';
      } else if (trimmedLine.startsWith('### Projects')) {
        currentSection = 'projects';
      } else if (trimmedLine.startsWith('### Achievements')) {
        currentSection = 'achievements';
      } else if (currentSection && trimmedLine) {
        // Check if this is a main bullet point (starts with "- " at beginning of line)
        if (line.startsWith('- ')) {
          // This is a main bullet point
          sections[currentSection].push(trimmedLine.substring(1).trim());
        } else if (line.startsWith(' - ') && (currentSection === 'projects' || currentSection === 'experience')) {
          // This is a sub-bullet point for projects/experience
          if (sections[currentSection].length > 0) {
            const lastIndex = sections[currentSection].length - 1;
            sections[currentSection][lastIndex] += '\n' + trimmedLine;
          }
        } else if (trimmedLine.startsWith('-') && currentSection !== 'projects' && currentSection !== 'experience') {
          // Handle other sections with normal bullet points
          sections[currentSection].push(trimmedLine.substring(1).trim());
        } else if (currentSection && trimmedLine && !trimmedLine.startsWith('###')) {
          // Handle other content
          if (currentSection === 'projects' || currentSection === 'experience') {
            // For projects and experience, append to last item if it exists
            if (sections[currentSection].length > 0) {
              const lastIndex = sections[currentSection].length - 1;
              sections[currentSection][lastIndex] += '\n' + trimmedLine;
            } else {
              sections[currentSection].push(trimmedLine);
            }
          } else {
            // For other sections, add as separate items
            sections[currentSection].push(trimmedLine);
          }
        }
      }
    });
  
    return sections;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header viewerType="owner" />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header viewerType="owner" />
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-xl">
            Error: {error}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const sortedData = [...leaderboardData].sort(
    (a, b) => (b.score || 0) - (a.score || 0)
  );

  // Enhanced project parsing function that extracts project names more accurately
const parseProjectName = (projectText) => {
  if (!projectText) return 'Unnamed Project';
  
  const firstLine = projectText.split('\n')[0];
  
  // Try different patterns to extract project name
  
  // Pattern 1: ProjectName (GitHub) | Tech Stack (Year)
  let match = firstLine.match(/^(.+?)\s*\(GitHub\)/);
  if (match) {
    return match[1].trim();
  }
  
  // Pattern 2: ProjectName | Tech Stack (Year)
  match = firstLine.match(/^(.+?)\s*\|/);
  if (match) {
    return match[1].trim();
  }
  
  // Pattern 3: ProjectName - Description
  match = firstLine.match(/^(.+?)\s*[-–]/);
  if (match) {
    return match[1].trim();
  }
  
  // Pattern 4: Just take the first part before any special characters
  match = firstLine.match(/^([^|\-–(]+)/);
  if (match) {
    return match[1].trim();
  }
  
  // Fallback: return the first line trimmed
  return firstLine.trim();
};


  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header viewerType="owner" />
      
      <div className="flex-1 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className={`transform transition-all duration-1000 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 mb-8 p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400/50 to-transparent animate-shimmer"></div>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3 mb-2">
                  <Trophy className="w-10 h-10 text-yellow-500" />
                  Interview Leaderboard
                </h1>
                <p className="text-gray-600 text-lg">
                  Performance rankings for all candidates
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-purple-600 font-medium">Total Candidates</p>
                <p className="text-4xl font-bold text-purple-600">
                  {sortedData.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className={`transform transition-all duration-1000 delay-200 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400/50 to-transparent animate-shimmer"></div>
            
            <div className="px-8 py-6 bg-gray-50/80 border-b border-gray-200/50">
              <h2 className="text-2xl font-semibold text-gray-900">Rankings</h2>
            </div>

            {sortedData.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <User className="w-16 h-16 mx-auto mb-6 text-gray-400" />
                <p className="text-lg">No candidates found for this interview.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200/50">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-8 py-4 text-left text-sm font-semibold text-purple-600 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-8 py-4 text-left text-sm font-semibold text-purple-600 uppercase tracking-wider">
                        Candidate
                      </th>
                      <th className="px-8 py-4 text-left text-sm font-semibold text-purple-600 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-8 py-4 text-left text-sm font-semibold text-purple-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-8 py-4 text-left text-sm font-semibold text-purple-600 uppercase tracking-wider">
                        Start Time
                      </th>
                      <th className="px-8 py-4 text-left text-sm font-semibold text-purple-600 uppercase tracking-wider">
                        End Time
                      </th>
                      <th className="px-8 py-4 text-left text-sm font-semibold text-purple-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/30">
                    {sortedData.map((candidate, index) => (
                      <tr
                        key={candidate.id}
                        className={`hover:bg-gray-50/50 transition-colors ${
                          index < 3 ? "bg-gradient-to-r from-purple-50/50 to-transparent" : ""
                        }`}
                      >
                        <td className="px-8 py-6 whitespace-nowrap">
                          <div className="flex items-center">
                            {getRankIcon(index + 1)}
                            <span className="ml-3 text-lg font-bold text-gray-900">
                              #{index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-12 w-12">
                              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
                                <User className="w-6 h-6 text-white" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-lg font-semibold text-gray-900">
                                {candidate.Application?.user?.username ||
                                  "Anonymous"}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {candidate.Application?.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap">
                          <div
                            className={`inline-flex px-4 py-2 rounded-full text-lg font-bold border ${getScoreColor(
                              candidate.score || 0
                            )}`}
                          >
                            {candidate.score
                              ? candidate.score.toFixed(1)
                              : "N/A"}
                          </div>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap">
                          {getStatusBadge(candidate.status)}
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center">
                            <Calendar className="w-5 h-5 mr-2 text-purple-500" />
                            {formatDateTime(candidate.start_time)}
                          </div>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center">
                            <Clock className="w-5 h-5 mr-2 text-purple-500" />
                            {candidate.end_time
                              ? formatDateTime(candidate.end_time)
                              : "In Progress"}
                          </div>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewDetails(candidate)}
                              className="text-blue-600 hover:text-blue-700 flex items-center gap-2 hover:bg-blue-50 px-3 py-2 rounded-lg transition-all duration-200 border border-blue-200 hover:border-blue-300"
                            >
                              <Eye className="w-4 h-4" />
                              Interview
                            </button>
                            <button
                              onClick={() => handleViewApplication(candidate.Application)}
                              className="text-green-600 hover:text-green-700 flex items-center gap-2 hover:bg-green-50 px-3 py-2 rounded-lg transition-all duration-200 border border-green-200 hover:border-green-300"
                            >
                              <FileText className="w-4 h-4" />
                              Application
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Performance Insights */}
        {sortedData.length > 0 && (
          <div className={`mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 transform transition-all duration-1000 delay-400 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-400/50 to-transparent"></div>
              <div className="flex items-center">
                <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
                <div className="ml-6">
                  <p className="text-sm font-medium text-green-600 uppercase tracking-wider">
                    Highest Score
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {Math.max(...sortedData.map((c) => c.score || 0)).toFixed(1)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"></div>
              <div className="flex items-center">
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <Trophy className="w-8 h-8 text-blue-600" />
                </div>
                <div className="ml-6">
                  <p className="text-sm font-medium text-blue-600 uppercase tracking-wider">
                    Average Score
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {(
                      sortedData.reduce((sum, c) => sum + (c.score || 0), 0) /
                      sortedData.length
                    ).toFixed(1)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400/50 to-transparent"></div>
              <div className="flex items-center">
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <User className="w-8 h-8 text-purple-600" />
                </div>
                <div className="ml-6">
                  <p className="text-sm font-medium text-purple-600 uppercase tracking-wider">
                    Completed
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {
                      sortedData.filter((c) => c.status === "completed").length
                    }
                    <span className="text-xl text-gray-500">/{sortedData.length}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interview Details Modal */}
      {showHistory && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 shadow-2xl">
            <div className="sticky top-0 bg-gray-50 px-6 py-4 flex justify-between items-center border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Interview Details - {selectedCandidate.Application?.user?.username}
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 text-gray-700">
              <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4 border border-gray-200">
                <div>
                  <p className="text-sm text-gray-500">Final Score</p>
                  <p className="text-xl font-bold text-blue-600">
                    {selectedCandidate.score?.toFixed(1) || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="mt-1">{getStatusBadge(selectedCandidate.status)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Recommendation</p>
                  <p className="text-sm font-medium">
                    {selectedCandidate.recommendation || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="text-sm font-medium">
                    {selectedCandidate.start_time && selectedCandidate.end_time
                      ? `${Math.round(
                          (new Date(selectedCandidate.end_time) -
                            new Date(selectedCandidate.start_time)) /
                            (1000 * 60)
                        )} min`
                      : "In Progress"}
                  </p>
                </div>
              </div>

              {selectedCandidate.feedback && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-2">Overall Feedback</h4>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                    <p className="text-sm text-gray-700">{selectedCandidate.feedback}</p>
                  </div>
                </div>
              )}

              {selectedCandidate.strengths && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-2">Strengths</h4>
                  <div className="bg-green-50 border-l-4 border-green-500 p-4">
                    <p className="text-sm text-gray-700">{selectedCandidate.strengths}</p>
                  </div>
                </div>
              )}

              {selectedCandidate.session && selectedCandidate.session.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Question-wise Performance</h4>
                  <div className="space-y-4">
                    {selectedCandidate.session.map((item, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <h5 className="font-medium text-gray-900">
                            Question {index + 1}
                          </h5>
                          {item.score && (
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(
                                item.score
                              )}`}
                            >
                              {item.score.toFixed(1)}
                            </span>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-purple-600">Main Question:</p>
                            <p className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                              {item.Customquestion?.question}
                            </p>
                          </div>

                          {item.Customquestion?.answer && (
                            <div>
                              <p className="text-sm font-medium text-purple-600">Expected Answer:</p>
                              <p className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                                {item.Customquestion.answer}
                              </p>
                            </div>
                          )}

                          {item.followups && item.followups.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-purple-600 mb-2">
                                Follow-up Questions:
                              </p>
                              <div className="space-y-2">
                                {item.followups.map((qa, qaIndex) => (
                                  <div key={qaIndex} className="bg-white p-3 rounded border border-gray-200">
                                    <p className="text-sm font-medium text-blue-600">
                                      Q: {qa.question}
                                    </p>
                                    <p className="text-sm text-gray-700 mt-1">
                                      A: {qa.answer}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {item.feedback && (
                            <div>
                              <p className="text-sm font-medium text-purple-600">Feedback:</p>
                              <p className="text-sm text-gray-700 bg-yellow-50 p-2 rounded border border-yellow-200">
                                {item.feedback}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Application Details Modal */}
      {showApplication && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 shadow-2xl">
            <div className="sticky top-0 bg-gray-50 px-6 py-4 flex justify-between items-center border-b border-gray-200">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowApplication(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-semibold text-gray-900">
                  Application Details - {selectedApplication.user?.username}
                </h3>
              </div>
              <button
                onClick={() => setShowApplication(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* Application Summary */}
              <div className="bg-gray-50/80 rounded-xl p-6 mb-6 border border-gray-200/50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">{selectedApplication.user?.username}</h4>
                    <p className="text-sm text-gray-500">Application ID: {selectedApplication.id}</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="mb-3">
                      <Star className="w-8 h-8 text-yellow-500 mx-auto" />
                    </div>
                    <p className="text-sm text-gray-500">Application Score</p>
                    <p className="text-2xl font-bold text-yellow-500">
                      {selectedApplication.score?.toFixed(1) || "N/A"}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="mb-3">
                      <Calendar className="w-8 h-8 text-blue-500 mx-auto" />
                    </div>
                    <p className="text-sm text-gray-500">Applied On</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDateTime(selectedApplication.applied_at)}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="mb-3">
                      <Target className="w-8 h-8 text-green-500 mx-auto" />
                    </div>
                    <p className="text-sm text-gray-500">Decision</p>
                    <div className="flex justify-center mt-2">
                      {getDecisionBadge(selectedApplication.shortlisting_decision)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Application Feedback */}
              {selectedApplication.feedback && (
                <div className="bg-gray-50/80 rounded-xl p-6 mb-6 border border-gray-200/50">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-500" />
                    Application Feedback
                  </h4>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <p className="text-gray-700 leading-relaxed">{selectedApplication.feedback}</p>
                  </div>
                </div>
              )}

              {/* Resume Toggle */}
              <div className="bg-gray-50/80 rounded-xl p-6 border border-gray-200/50">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-500" />
                    Resume
                  </h4>
                  <div className="flex bg-gray-200/50 rounded-lg p-1">
                    <button
                      onClick={() => setResumeView('extracted')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        resumeView === 'extracted'
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                      }`}
                    >
                      Extracted Resume
                    </button>
                    <button
                      onClick={() => setResumeView('original')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        resumeView === 'original'
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                      }`}
                    >
                      Original Resume
                    </button>
                  </div>
                </div>

                {resumeView === 'extracted' ? (
                  <div className="space-y-8">
                    {(() => {
                      const resumeData = parseExtractedResume(selectedApplication.extratedResume);
                      if (!resumeData) return (
                        <div className="flex items-center justify-center py-16">
                          <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                              <User className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 text-lg">No extracted resume data available.</p>
                          </div>
                        </div>
                      );

                      return (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          {/* Personal Details */}
                          {resumeData.personalDetails.length > 0 && (
                            <div className="group relative bg-white/60 rounded-xl p-6 border border-gray-200/50 backdrop-blur-sm hover:border-blue-300/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-5">
                                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-300">
                                    <User className="w-5 h-5 text-blue-600 group-hover:text-blue-700" />
                                  </div>
                                  <h5 className="text-xl font-bold text-gray-900 group-hover:text-blue-800 transition-colors duration-300">
                                    Personal Details
                                  </h5>
                                </div>
                                <div className="space-y-3">
                                  {resumeData.personalDetails.map((detail, index) => (
                                    <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors duration-200">
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                                      <p className="text-gray-700 text-sm leading-relaxed hover:text-gray-900 transition-colors duration-200">
                                        {detail}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Skills */}
                          {resumeData.skills.length > 0 && (
                            <div className="group relative bg-white/60 rounded-xl p-6 border border-gray-200/50 backdrop-blur-sm hover:border-green-300/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10">
                              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-5">
                                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors duration-300">
                                    <Code className="w-5 h-5 text-green-600 group-hover:text-green-700" />
                                  </div>
                                  <h5 className="text-xl font-bold text-gray-900 group-hover:text-green-800 transition-colors duration-300">
                                    Skills
                                  </h5>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {resumeData.skills.map((skill, index) => (
                                    <div key={index} className="px-3 py-2 bg-green-50 rounded-lg border border-green-200 hover:border-green-300 hover:bg-green-100 transition-all duration-200 group/skill">
                                      <p className="text-green-700 text-sm font-medium group-hover/skill:text-green-800 transition-colors duration-200">
                                        {skill}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Experience */}
                          {resumeData.experience.length > 0 && (
                            <div className="group relative bg-white/60 rounded-xl p-6 border border-gray-200/50 backdrop-blur-sm hover:border-purple-300/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 lg:col-span-2">
                              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6">
                                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors duration-300">
                                    <Briefcase className="w-5 h-5 text-purple-600 group-hover:text-purple-700" />
                                  </div>
                                  <h5 className="text-xl font-bold text-gray-900 group-hover:text-purple-800 transition-colors duration-300">
                                    Experience
                                  </h5>
                                </div>
                                <div className="space-y-4">
                                  {resumeData.experience.map((exp, index) => (
                                    <div key={index} className="relative pl-6 pb-4 last:pb-0">
                                      {index < resumeData.experience.length - 1 && (
                                        <div className="absolute left-2 top-8 bottom-0 w-0.5 bg-gradient-to-b from-purple-400/50 to-transparent"></div>
                                      )}
                                      <div className="absolute left-0 top-2 w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow-lg shadow-purple-500/30"></div>
                                      <div className="bg-white/80 rounded-lg p-5 border border-gray-200/50 hover:border-purple-300/50 hover:bg-white/90 transition-all duration-300">
                                        <p className="text-gray-700 text-sm leading-relaxed hover:text-gray-900 transition-colors duration-200">{exp}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Education */}
                          {resumeData.education.length > 0 && (
                            <div className="group relative bg-white/60 rounded-xl p-6 border border-gray-200/50 backdrop-blur-sm hover:border-yellow-300/50 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10">
                              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-5">
                                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-yellow-200 transition-colors duration-300">
                                    <GraduationCap className="w-5 h-5 text-yellow-600 group-hover:text-yellow-700" />
                                  </div>
                                  <h5 className="text-xl font-bold text-gray-900 group-hover:text-yellow-800 transition-colors duration-300">
                                    Education
                                  </h5>
                                </div>
                                <div className="space-y-3">
                                  {resumeData.education.map((edu, index) => (
                                    <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50/80 border border-yellow-200/50 hover:border-yellow-300/50 hover:bg-yellow-100/80 transition-all duration-200">
                                      <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0"></div>
                                      <p className="text-gray-700 text-sm leading-relaxed hover:text-gray-900 transition-colors duration-200">
                                        {edu}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Certifications */}
                          {resumeData.certifications.length > 0 && (
                            <div className="group relative bg-white/60 rounded-xl p-6 border border-gray-200/50 backdrop-blur-sm hover:border-orange-300/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
                              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-5">
                                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors duration-300">
                                    <AwardIcon className="w-5 h-5 text-orange-600 group-hover:text-orange-700" />
                                  </div>
                                  <h5 className="text-xl font-bold text-gray-900 group-hover:text-orange-800 transition-colors duration-300">
                                    Certifications
                                  </h5>
                                </div>
                                <div className="space-y-3">
                                  {resumeData.certifications.map((cert, index) => (
                                    <div key={index} className="relative overflow-hidden">
                                      <div className="absolute inset-0 bg-gradient-to-r from-orange-100/50 via-orange-50/50 to-transparent rounded-lg"></div>
                                      <div className="relative p-4 rounded-lg border border-orange-200/50 hover:border-orange-300/50 transition-all duration-200 hover:shadow-md hover:shadow-orange-500/10">
                                        <p className="text-gray-700 text-sm leading-relaxed hover:text-gray-900 transition-colors duration-200">
                                          {cert}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Projects */}
                          {resumeData.projects.length > 0 && (
                            <div className="group relative bg-white/60 rounded-xl p-6 border border-gray-200/50 backdrop-blur-sm hover:border-cyan-300/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 lg:col-span-2">
                              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center group-hover:bg-cyan-200 transition-colors duration-300">
                                      <Code className="w-5 h-5 text-cyan-600 group-hover:text-cyan-700" />
                                    </div>
                                    <h5 className="text-xl font-bold text-gray-900 group-hover:text-cyan-800 transition-colors duration-300">
                                      Projects
                                    </h5>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                                    <span>{resumeData.projects.length} Projects</span>
                                  </div>
                                </div>
                                
                                <div className="relative">
                                  {/* Timeline Line */}
                                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-400/60 via-cyan-400/40 to-cyan-400/20 rounded-full"></div>
                                  
                                  <div className="space-y-8">
                                    {resumeData.projects.map((project, index) => {
                                      // Parse project data
                                      const lines = project.split('\n').filter(line => line.trim());
                                      const firstLine = lines[0] || '';
                                      
                                      // Extract project name using the enhanced function
                                      const projectName = parseProjectName(firstLine);
                                      
                                      // Extract tech stack and year
                                      const projectMatch = firstLine.match(/\|\s*(.+?)\s*\((\d{4})\)/);
                                      const techStack = projectMatch ? projectMatch[1].split(',').map(t => t.trim()) : [];
                                      const year = projectMatch ? projectMatch[2] : new Date().getFullYear();
                                      
                                      // Extract description lines (lines starting with spaces or dashes after first line)
                                      const descriptionLines = lines.slice(1).filter(line => line.trim().startsWith('-') || line.trim().match(/^\s/));
                                      
                                      return (
                                        <div key={index} className="relative flex gap-6 group/project">
                                          {/* Timeline Node */}
                                          <div className="relative flex-shrink-0">
                                            <div className="w-12 h-12 bg-gradient-to-br from-cyan-100 to-cyan-200 rounded-xl flex items-center justify-center border-2 border-cyan-300 shadow-lg shadow-cyan-500/20 group-hover/project:border-cyan-400 group-hover/project:shadow-cyan-500/30 transition-all duration-300">
                                              <Code className="w-5 h-5 text-cyan-600 group-hover/project:text-cyan-700" />
                                            </div>
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                                          </div>

                                          {/* Project Content */}
                                          <div className="flex-1 pb-4">
                                            {/* Project Header */}
                                            <div className="flex items-start justify-between mb-3">
                                              <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                  <h6 className="text-gray-900 font-bold text-xl group-hover/project:text-cyan-800 transition-colors duration-300">
                                                    {projectName}
                                                  </h6>
                                                  <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full border border-gray-200">
                                                    <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                                                      <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                                                    </svg>
                                                    <span className="text-gray-500 text-xs">GitHub</span>
                                                  </div>
                                                  {year !== new Date().getFullYear() && (
                                                    <div className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-md border border-purple-200">
                                                      {year}
                                                    </div>
                                                  )}
                                                </div>
                                                
                                                {/* Tech Stack */}
                                                {techStack.length > 0 && (
                                                  <div className="flex flex-wrap gap-2 mb-4">
                                                    {techStack.slice(0, 8).map((tech, techIndex) => (
                                                      <span key={techIndex} className="px-3 py-1 bg-cyan-50 text-cyan-700 text-xs rounded-lg border border-cyan-200 hover:border-cyan-300 hover:bg-cyan-100 transition-all duration-200 font-medium">
                                                        {tech}
                                                      </span>
                                                    ))}
                                                    {techStack.length > 8 && (
                                                      <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg border border-gray-200 font-medium">
                                                        +{techStack.length - 8} more
                                                      </span>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            </div>

                                            {/* Project Description */}
                                            <div className="relative bg-gray-50/60 rounded-lg p-4 border border-gray-200/50 group-hover/project:border-cyan-300/50 group-hover/project:bg-gray-100/60 transition-all duration-300">
                                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-cyan-600 rounded-r-full opacity-60 group-hover/project:opacity-100 transition-opacity duration-300"></div>
                                              <div className="pl-4">
                                                {descriptionLines.length > 0 ? (
                                                  <div className="space-y-3">
                                                    {descriptionLines.slice(0, 5).map((desc, descIndex) => (
                                                      <div key={descIndex} className="flex items-start gap-3">
                                                        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full mt-2 flex-shrink-0 group-hover/project:bg-cyan-600 transition-colors duration-300"></div>
                                                        <p className="text-gray-700 text-sm leading-relaxed group-hover/project:text-gray-900 transition-colors duration-300">
                                                          {desc.replace(/^[-\s]+/, '').trim()}
                                                        </p>
                                                      </div>
                                                    ))}
                                                    {descriptionLines.length > 5 && (
                                                      <div className="flex items-center gap-3 pt-2 border-t border-gray-200/50">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                                                        <span className="text-gray-500 text-xs font-medium">
                                                          +{descriptionLines.length - 5} additional features
                                                        </span>
                                                      </div>
                                                    )}
                                                  </div>
                                                ) : (
                                                  <p className="text-gray-700 text-sm leading-relaxed group-hover/project:text-gray-900 transition-colors duration-300 pl-4">
                                                    {project.replace(/^[-\s]*/, '').trim()}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                                
                              </div>
                            </div>
                          )}

                          {/* Achievements */}
                          {resumeData.achievements.length > 0 && (
                            <div className="group relative bg-white/60 rounded-xl p-6 border border-gray-200/50 backdrop-blur-sm hover:border-amber-300/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10 lg:col-span-2">
                              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6">
                                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition-colors duration-300">
                                    <Trophy className="w-5 h-5 text-amber-600 group-hover:text-amber-700" />
                                  </div>
                                  <h5 className="text-xl font-bold text-gray-900 group-hover:text-amber-800 transition-colors duration-300">
                                    Achievements
                                  </h5>
                                </div>
                                <div className="space-y-4">
                                  {resumeData.achievements.map((achievement, index) => (
                                    <div key={index} className="relative group/achievement">
                                      <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-amber-500 to-amber-600 rounded-full opacity-60 group-hover/achievement:opacity-100 transition-opacity duration-300"></div>
                                      <div className="relative ml-6 bg-white/80 rounded-lg p-4 border border-gray-200/50 hover:border-amber-300/50 hover:bg-white/90 transition-all duration-300">
                                        <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-amber-500 rounded-full opacity-50 group-hover/achievement:opacity-100 group-hover/achievement:scale-125 transition-all duration-300"></div>
                                        <p className="text-gray-700 text-sm leading-relaxed hover:text-gray-900 transition-colors duration-200 pr-4">{achievement}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="bg-gray-100/50 rounded-lg p-6 border border-gray-200/50">
                    
                    {selectedApplication.resume ? (
                      <div className="bg-white/80 rounded-lg p-4 border border-gray-200/50">
                        <div className="flex justify-between items-center mb-4">
                          <p className="text-gray-700 text-sm">
                            View the embedded resume or click download to access the original PDF.
                          </p>
                        </div>

                        <div className="aspect-[4/5] bg-white rounded-lg border border-gray-300 overflow-hidden">
                          <iframe
                            src={`https://docs.google.com/gview?url=${encodeURIComponent(selectedApplication.resume)}&embedded=true`}
                            className="w-full h-full"
                            frameBorder="0"
                            title="Resume PDF"
                          ></iframe>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white/80 rounded-lg p-8 border border-gray-200/50 text-center">
                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No original resume available</p>
                      </div>
                    )}

                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  );
};

export default Leaderboard;