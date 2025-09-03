import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAuthToken, fetchWithToken } from "../utils/handleToken";
import Header from '../components/ui/header';
import Footer from '../components/ui/footer';
import { Loader2, Github, Brain, Upload, CheckCircle, Clock } from "lucide-react";
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from "framer-motion";

export default function UserDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState(null);
  const [formData, setFormData] = useState({});
  const [viewerType, setViewerType] = useState("guest");
  const [interviews, setInterviews] = useState([]);
  const [resumeFiles, setResumeFiles] = useState({});
  const [uploadingResume, setUploadingResume] = useState({});
  const [applyingToInterview, setApplyingToInterview] = useState({});
  const [activeTab, setActiveTab] = useState('available');
  const [profileImage, setProfileImage] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchProfile = async () => {
      const token = getAuthToken();
      const data = await fetchWithToken(`${API_URL}/users/profile/${id}/`, token, navigate);
      
      if (data) {
        setProfile(data.profile);
        setFormData(data.profile);
        setProfileImage(data.profile.photo);
      }

      if (token) {
        try {
          const res = await fetch(`${API_URL}/users/check-user/${id}/`, {
            headers: { Authorization: `Token ${token}` },
          });
          const result = await res.json();
          setViewerType(res.ok && result.success ? "owner" : "authenticated");

          const interviewsRes = await fetch(`${API_URL}/interview/get-all-interviews/`, {
            headers: { Authorization: `Token ${token}` },
          });
          if (interviewsRes.ok) setInterviews(await interviewsRes.json());
        } catch {
          setViewerType("guest");
        }
      } else {
        setViewerType("guest");
      }
      setLoading(false);
    };

    fetchProfile();
  }, [id, navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should not exceed 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setProfileImage(reader.result);
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("pinataMetadata", JSON.stringify({
      name: `profile_${id}_${file.name}`,
      keyvalues: { user_id: id, uploaded_at: new Date().toISOString() }
    }));
    formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

    try {
      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: { Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT_TOKEN}` },
        body: formData,
      });
      const data = await res.json();
      
      if (res.ok && data.IpfsHash) {
        const imageUrl = `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
        setFormData((prev) => ({ ...prev, photo: imageUrl }));
        await handleSave("photo", imageUrl);
      } else {
        toast.error("Failed to upload profile picture.");
        setProfileImage(profile.photo);
      }
    } catch (err) {
      toast.error("Error uploading profile picture.");
      setProfileImage(profile.photo);
    }
  };

  const handleSave = async (field, value) => {
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_URL}/users/profile/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ [field]: value || formData[field] }),
      });
      const data = await response.json();
      if (data.success) {
        setProfile((prev) => ({ ...prev, [field]: value || formData[field] }));
        setEditingField(null);
        toast.success("Profile updated successfully!");
      } else {
        toast.error("Update failed: " + JSON.stringify(data.errors));
      }
    } catch (error) {
      toast.error("Server error while updating.");
    }
  };

  const handleResumeUpload = async (e, interviewId) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file only.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size should not exceed 5MB.");
      return;
    }

    setUploadingResume(prev => ({ ...prev, [interviewId]: true }));
    const formData = new FormData();
    formData.append("file", file);
    formData.append("pinataMetadata", JSON.stringify({
      name: `resume_${interviewId}_${file.name}`,
      keyvalues: { interview_id: interviewId, uploaded_at: new Date().toISOString() }
    }));
    formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

    try {
      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: { Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT_TOKEN}` },
        body: formData,
      });
      const data = await res.json();
      
      if (res.ok && data.IpfsHash) {
        setResumeFiles((prev) => ({
          ...prev,
          [interviewId]: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`
        }));
        toast.success("Resume uploaded successfully!");
      } else {
        toast.error("Failed to upload resume.");
      }
    } catch (err) {
      toast.error("Error uploading resume.");
    } finally {
      setUploadingResume(prev => ({ ...prev, [interviewId]: false }));
    }
  };

  const handleApply = async (interviewId) => {
    const token = getAuthToken();
    const resumeUrl = resumeFiles[interviewId];
    if (!resumeUrl) return toast.error("Please upload your resume first.");

    setApplyingToInterview(prev => ({ ...prev, [interviewId]: true }));
    try {
      const response = await fetch(`${API_URL}/interview/apply-interview/${interviewId}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ resume_url: resumeUrl }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success("Application submitted successfully!");
        setResumeFiles((prev) => ({ ...prev, [interviewId]: null }));
        const interviewsRes = await fetch(`${API_URL}/interview/get-all-interviews/`, {
          headers: { Authorization: `Token ${token}` },
        });
        if (interviewsRes.ok) setInterviews(await interviewsRes.json());
      } else {
        toast.error("Failed to apply: " + (data.error || JSON.stringify(data)));
      }
    } catch (err) {
      toast.error("Error applying to interview.");
    } finally {
      setApplyingToInterview(prev => ({ ...prev, [interviewId]: false }));
    }
  };

  const renderInterviewActions = (interview) => {
    const { id: interviewId, has_applied, application_status, attempted } = interview;

    if (has_applied) {
      if (application_status) {
        return attempted ? (
          <div className="mt-2 flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <p>Your result will be announced soon.</p>
          </div>
        ) : (
          <button
            onClick={() => navigate(`/interview/start/${interviewId}`)}
            className="mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Start Interview
          </button>
        );
      }
      return (
        <div className="mt-2 flex items-center gap-2 text-orange-600">
          <Clock className="w-4 h-4" />
          <p>Your application is under review</p>
        </div>
      );
    }

    const resumeUploaded = resumeFiles[interviewId];
    const isUploading = uploadingResume[interviewId];
    const isApplying = applyingToInterview[interviewId];

    return (
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => handleResumeUpload(e, interviewId)}
            className="text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer"
            disabled={isUploading || isApplying}
          />
          {isUploading && (
            <div className="flex items-center gap-1 text-sm text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </div>
          )}
          {resumeUploaded && !isUploading && (
            <div className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              Resume uploaded
            </div>
          )}
        </div>
        <button
          onClick={() => handleApply(interviewId)}
          disabled={!resumeUploaded || isUploading || isApplying}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            !resumeUploaded || isUploading || isApplying
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isApplying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Applying...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Apply
            </>
          )}
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700 bg-gray-50">
        <Loader2 className="w-6 h-6 mr-2 animate-spin" /> Loading profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600 bg-gray-50">
        Profile not found.
      </div>
    );
  }

  const githubUsername = profile?.github || "";
  const leetcodeUsername = profile?.leetcode || "";
  const availableInterviews = interviews.filter((i) => !i.attempted);
  const attendedInterviews = interviews.filter((i) => i.attempted);

  // Animation variants for stats cards
  const cardVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
    hover: { scale: 1.02, boxShadow: "0 8px 32px rgba(31, 38, 135, 0.2)", transition: { duration: 0.2 } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-white text-gray-800 relative overflow-hidden">
      <Header viewerType={viewerType} />
      <div className="flex flex-col items-center py-16 px-4 relative z-10">
        <div className="max-w-6xl w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* About Me Section (Left) */}
            <AnimatePresence mode="wait">
              <motion.div
                key={editingField === "bio" ? "bio-edit" : "bio-view"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white/30 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-6"
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-4">About Me</h2>
                {viewerType === "owner" && editingField === "bio" ? (
                  <div className="space-y-2">
                    <textarea
                      name="bio"
                      value={formData.bio || ""}
                      onChange={handleChange}
                      className="bg-blue-50 text-gray-800 p-2 rounded border border-blue-200 w-full font-mono text-sm"
                      placeholder="Tell us about yourself...\n- Use bullet points\n- Or numbered lists\n- Keep spacing"
                      rows="6"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave("bio")}
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingField(null)}
                        className="text-sm bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <pre
                    className="text-gray-600 font-mono text-sm whitespace-pre-line cursor-pointer"
                    onClick={() => viewerType === "owner" && setEditingField("bio")}
                  >
                    {profile.bio || "This user has not added a bio."}
                  </pre>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Profile Container (Right) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white/30 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-6 flex flex-col gap-6"
            >
              {/* Profile Picture and Username */}
              <div className="flex flex-col items-center">
                {viewerType === "owner" && editingField === "photo" ? (
                  <div className="flex flex-col items-center space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingField(null)}
                        className="text-sm bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <motion.img
                    key={profileImage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    src={profileImage || profile.photo}
                    alt="User Profile"
                    className="w-24 h-24 rounded-full border-2 border-blue-400 shadow-lg cursor-pointer"
                    onClick={() => viewerType === "owner" && setEditingField("photo")}
                  />
                )}
                {viewerType === "owner" && editingField === "username" ? (
                  <div className="mt-4 space-y-2">
                    <input
                      name="username"
                      value={formData.username || ""}
                      onChange={handleChange}
                      className="bg-blue-50 text-gray-800 p-2 rounded border border-blue-200"
                      placeholder="Enter username"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave("username")}
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingField(null)}
                        className="text-sm bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <h1
                    className="mt-4 text-2xl font-bold text-gray-800 cursor-pointer"
                    onClick={() => viewerType === "owner" && setEditingField("username")}
                  >
                    @{profile.username || "Anonymous"}
                  </h1>
                )}
              </div>

              {/* GitHub Stats */}
              <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10" />
                <h3
                  className="text-gray-800 text-lg font-semibold mb-2 flex items-center gap-2 cursor-pointer relative z-10"
                  onClick={() => viewerType === "owner" && setEditingField("github")}
                >
                  <Github className="w-5 h-5" /> GitHub Stats
                </h3>
                {viewerType === "owner" && editingField === "github" ? (
                  <div className="space-y-2 relative z-10">
                    <input
                      name="github"
                      value={formData.github || ""}
                      onChange={handleChange}
                      className="bg-blue-50 text-gray-800 p-2 rounded border border-blue-200 w-full"
                      placeholder="Enter GitHub username"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave("github")}
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingField(null)}
                        className="text-sm bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10">
                    <p className="text-sm text-gray-600 mb-2">Username:</p>
                    <a
                      href={`https://github.com/${githubUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {githubUsername || "Not set"}
                    </a>
                    {githubUsername && (
                      <div className="mt-4 rounded-xl overflow-hidden">
                        <img
                          src={`https://github-readme-stats.vercel.app/api?username=${githubUsername}&show_icons=true&theme=default`}
                          alt="GitHub Stats"
                          className="w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}
              </motion.div>

              {/* LeetCode Stats */}
              <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10" />
                <h3
                  className="text-gray-800 text-lg font-semibold mb-2 flex items-center gap-2 cursor-pointer relative z-10"
                  onClick={() => viewerType === "owner" && setEditingField("leetcode")}
                >
                  <Brain className="w-5 h-5 text-orange-500" /> LeetCode Stats
                </h3>
                {viewerType === "owner" && editingField === "leetcode" ? (
                  <div className="space-y-2 relative z-10">
                    <input
                      name="leetcode"
                      value={formData.leetcode || ""}
                      onChange={handleChange}
                      className="bg-blue-50 text-gray-800 p-2 rounded border border-blue-200 w-full"
                      placeholder="Enter LeetCode username"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave("leetcode")}
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingField(null)}
                        className="text-sm bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10">
                    <p className="text-sm text-gray-600 mb-2">Username:</p>
                    <a
                      href={`https://leetcode.com/${leetcodeUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-600 hover:underline break-all"
                    >
                      {leetcodeUsername || "Not set"}
                    </a>
                    {leetcodeUsername && (
                      <div className="mt-4 rounded-xl overflow-hidden">
                        <img
                          src={`https://leetcard.jacoblin.cool/${leetcodeUsername}?theme=light&font=baloo&show_rank=true`}
                          alt="LeetCode Card"
                          className="w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          </div>

          {/* Tabs for Interviews */}
          {viewerType === "owner" && interviews.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-6xl w-full mt-12 bg-white/30 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-6"
            >
              <div className="flex space-x-4 mb-6">
                <button
                  onClick={() => setActiveTab('available')}
                  className={`pb-2 text-lg font-semibold ${
                    activeTab === 'available' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'
                  }`}
                >
                  Available Interviews
                </button>
                <button
                  onClick={() => setActiveTab('attended')}
                  className={`pb-2 text-lg font-semibold ${
                    activeTab === 'attended' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'
                  }`}
                >
                  Attended Interviews
                </button>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {(activeTab === 'available' ? availableInterviews : attendedInterviews).map((interview) => (
                    <div
                      key={interview.id}
                      className="bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl p-6"
                    >
                      <div className="space-y-3">
                        <div>
                          <span className="text-blue-600 font-medium">Position:</span>
                          <p className="text-gray-800 text-lg font-semibold">{interview.post}</p>
                        </div>
                        <div>
                          <span className="text-blue-600 font-medium">Description:</span>
                          <p className="text-gray-700">{interview.desc}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-blue-600 font-medium">Experience Required:</span>
                            <p className="text-gray-800">{interview.experience} years</p>
                          </div>
                          <div>
                            <span className="text-blue-600 font-medium">Deadline:</span>
                            <p className="text-gray-800">{new Date(interview.submissionDeadline).toLocaleString()}</p>
                          </div>
                        </div>
                        {renderInterviewActions(interview)}
                      </div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}