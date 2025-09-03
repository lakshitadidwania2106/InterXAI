import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Play, Send, CheckCircle, XCircle, Code, AlertCircle, Menu, X, Target, TrendingUp, Zap, BarChart3 } from 'lucide-react';
import { getAuthToken, fetchWithToken } from '../utils/handleToken';
import { useParams, useNavigate } from 'react-router-dom';

const TIME_LIMIT = 30 * 60; // 30 minutes in seconds
const LANGUAGES = ['Python', 'C++', 'Java'];
const CODE_TEMPLATES = {
  Python: `# Write your solution here
def solution():
    # Your code here
    pass

# Test your solution
if __name__ == "__main__":
    result = solution()
    print(result)`,
  'C++': `#include <iostream>
#include <vector>
using namespace std;

// Write your solution here
int solution() {
    // Your code here
    return 0;
}

int main() {
    int result = solution();
    cout << result << endl;
    return 0;
}`,
  Java: `public class Solution {
    // Write your solution here
    public static int solution() {
        // Your code here
        return 0;
    }
    
    public static void main(String[] args) {
        int result = solution();
        System.out.println(result);
    }
}`
};

const DSAInterviewPlatform = () => {
  const params = useParams();
  const navigate = useNavigate();
  const { sessionId } = params;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [dsaTopics, setDsaTopics] = useState([]); // Backend topics
  const [code, setCode] = useState(CODE_TEMPLATES.Python);
  const [selectedLanguage, setSelectedLanguage] = useState('Python');
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [submittedQuestions, setSubmittedQuestions] = useState([]);
  const [score, setScore] = useState(0);
  const [runResult, setRunResult] = useState(null);
  const [runsLeft, setRunsLeft] = useState({});
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleFinalSubmit(); // This now navigates directly
    }
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch DSA topics from backend
  const fetchDSATopics = async () => {
    const token = getAuthToken();
    if (!token) {
      setError('Authentication required');
      return [];
    }

    try {
      const data = await fetchWithToken(
        `http://localhost:8000/api/interview/get-dsa-questions/${sessionId}/`,
        token,
        navigate,
      );
      console.log(data);
      if (data.length === 0) {
        console.log('Fetched DSA topics:', data);
        navigate('/');
        return data;
      }
      return data;
    } catch (error) {
      navigate('/');
      console.error('Error fetching DSA topics:', error);
      setError('Failed to fetch DSA topics');
      return [];
    }
  };

  const callGroqAPI = async (prompt) => {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Groq API Error:', error);
      setError('Failed to connect to API. Please check your connection.');
      return null;
    }
  };

  const generateQuestion = async (topic, difficulty) => {
    const prompt = `Generate a DSA coding problem for topic: ${topic} with difficulty: ${difficulty}. 
    Respond ONLY with a valid JSON object in this exact format, with no additional text, markdown, or explanations:
    {
      "title": "Problem Title",
      "description": "Problem description with clear constraints, examples, and what the function should do. Include input/output format.",
      "testCases": [
        {"input": "input1", "output": "expected_output1", "description": "test case 1 description"},
        {"input": "input2", "output": "expected_output2", "description": "test case 2 description"},
        {"input": "input3", "output": "expected_output3", "description": "test case 3 description"}
      ],
      "sampleInput": "sample input for testing",
      "sampleOutput": "expected sample output",
      "difficulty": "${difficulty}",
      "hints": ["hint1", "hint2"]
    }
    
    Make sure:
    1. The problem is clear and has examples
    2. Test cases cover edge cases
    3. Input/output format is specified
    4. Problem is language-agnostic
    5. Difficulty level matches: ${difficulty}`;

    const response = await callGroqAPI(prompt);
    if (response) {
      try {
        // Clean response to extract JSON
        let cleanResponse = response.trim();
        cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        const jsonStart = cleanResponse.indexOf('{');
        const jsonEnd = cleanResponse.lastIndexOf('}') + 1;
        if (jsonStart === -1 || jsonEnd === 0) {
          throw new Error('No valid JSON found in response');
        }
        cleanResponse = cleanResponse.slice(jsonStart, jsonEnd);
        
        const parsedQuestion = JSON.parse(cleanResponse);
        if (!parsedQuestion.title || !parsedQuestion.description || !parsedQuestion.testCases) {
          throw new Error('Invalid question format');
        }
        
        return parsedQuestion;
      } catch (e) {
        console.error('Failed to parse question JSON:', e, 'Response:', response);
        return null;
      }
    }
    return null;
  };

  const initializeQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    // Fetch DSA topics from backend
    const backendTopics = await fetchDSATopics();
    if (!backendTopics || backendTopics.length === 0) {
      setError('No DSA topics found for this session');
      setLoading(false);
      return;
    }

    setDsaTopics(backendTopics);
    
    // Generate questions for each topic
    const generatedQuestions = [];
    
    for (let i = 0; i < Math.min(backendTopics.length, 3); i++) {
      const dsaTopic = backendTopics[i];
      const question = await generateQuestion(dsaTopic.topic, dsaTopic.difficulty);
      if (question) {
        generatedQuestions.push({ 
          ...question, 
          topic: dsaTopic.topic,
          difficulty: dsaTopic.difficulty,
          dsaTopicId: dsaTopic.id,
          id: i 
        });
      } else {
        generatedQuestions.push({
          id: i,
          topic: dsaTopic.topic,
          difficulty: dsaTopic.difficulty,
          dsaTopicId: dsaTopic.id,
          title: `${dsaTopic.topic.charAt(0).toUpperCase() + dsaTopic.topic.slice(1)} Problem`,
          description: `Solve a ${dsaTopic.topic} related problem with ${dsaTopic.difficulty} difficulty. Implement the solution function.`,
          testCases: [
            { input: "test1", output: "result1", description: "Basic test case" },
            { input: "test2", output: "result2", description: "Edge case" },
            { input: "test3", output: "result3", description: "Complex case" }
          ],
          sampleInput: "sample",
          sampleOutput: "expected",
          hints: ["Consider the problem constraints", "Think about edge cases"]
        });
      }
    }
    
    if (generatedQuestions.length === 0) {
      setError('Failed to generate questions. Please refresh the page.');
    } else {
      setQuestions(generatedQuestions);
      setCode(CODE_TEMPLATES.Python);
      const initialRuns = {};
      generatedQuestions.forEach((_, index) => {
        initialRuns[index] = 3;
      });
      setRunsLeft(initialRuns);
    }
    
    setLoading(false);
  }, [sessionId, navigate]);

  useEffect(() => {
    if (sessionId) {
      initializeQuestions();
    } else {
      setError('Session ID is required');
    }
  }, [initializeQuestions, sessionId]);

  const runSingleTest = async () => {
    if (!questions[currentQuestionIndex]) return;
    
    const remainingRuns = runsLeft[currentQuestionIndex] || 0;
    if (remainingRuns <= 0) {
      setRunResult({
        isOutput: false,
        message: 'No runs left for this question'
      });
      return;
    }
    
    setIsTestRunning(true);
    setRunResult(null);
    const question = questions[currentQuestionIndex];
    
    const prompt = `Execute this ${selectedLanguage} code with the given input and return ONLY the output.

    CRITICAL INSTRUCTIONS:
    - Run the code with the provided input
    - Return ONLY the actual output that the code produces
    - Do NOT include any explanations, descriptions, or additional text
    - Do NOT say "Output:" or "Result:" - just return the raw output
    - If there's an error, return only the error message

    Code:
    ${code}

    Input: ${question.sampleInput}

    Execute and return only the output:`;

    const result = await callGroqAPI(prompt);
    
    setRunsLeft(prev => ({
      ...prev,
      [currentQuestionIndex]: remainingRuns - 1
    }));
    
    if (result) {
      setRunResult({
        isOutput: true,
        message: result.trim(),
        expected: question.sampleOutput
      });
    } else {
      setRunResult({
        isOutput: false,
        message: 'Failed to execute code'
      });
    }
    setIsTestRunning(false);
  };

  const submitQuestion = async () => {
    if (!questions[currentQuestionIndex]) return;
    
    setIsTestRunning(true);
    setTestResult(null);
    const question = questions[currentQuestionIndex];
    
    let passedTests = 0;
    const testResults = [];
    
    for (let i = 0; i < question.testCases.length; i++) {
      const testCase = question.testCases[i];
      
      const prompt = `Execute this ${selectedLanguage} code with the given test case.

      CRITICAL: Respond ONLY with:
      - "PASS" (if code executes correctly and output matches expected)
      - "FAIL: [brief reason]" (if code fails or output is wrong)

      Do NOT include code descriptions, explanations, or additional commentary.

      Code:
      ${code}

      Test Input: ${testCase.input}
      Expected Output: ${testCase.output}

      Execute the code and compare actual output with expected output.`;
      
      const result = await callGroqAPI(prompt);
      if (result) {
        const passed = result.trim().toUpperCase().startsWith('PASS');
        if (passed) passedTests++;
        testResults.push({
          passed,
          message: result.trim(),
          testCase: testCase.description
        });
      } else {
        testResults.push({
          passed: false,
          message: 'Test execution failed',
          testCase: testCase.description
        });
      }
    }
    
    const allPassed = passedTests === question.testCases.length;
    const questionScore = allPassed ? 10 : Math.floor((passedTests / question.testCases.length) * 10);
    
    // Submit to backend
    await submitToBackend(question, questionScore);
    
    const newSubmission = {
      questionIndex: currentQuestionIndex,
      questionId: question.id,
      dsaTopicId: question.dsaTopicId,
      code,
      testResults,
      passedTests,
      totalTests: question.testCases.length,
      score: questionScore,
      allPassed,
      title: question.title,
      topic: question.topic
    };
    
    const updatedSubmissions = submittedQuestions.filter(sub => sub.questionIndex !== currentQuestionIndex);
    updatedSubmissions.push(newSubmission);
    setSubmittedQuestions(updatedSubmissions);
    
    const totalScore = updatedSubmissions.reduce((acc, sub) => acc + sub.score, 0);
    setScore(totalScore);
    
    setTestResult(newSubmission);
    setIsTestRunning(false);
  };

  const submitToBackend = async (question, questionScore) => {
    const token = getAuthToken();
    if (!token) {
      console.error('No auth token found');
      return;
    }

    try {
      const submissionData = {
        question: JSON.stringify({
          title: question.title,
          description: question.description,
          topic: question.topic,
          difficulty: question.difficulty
        }),
        code: code,
        score: questionScore
      };

      const response = await fetchWithToken(
        `http://localhost:8000/api/interview/add-dsa-scores/${sessionId}/${question.dsaTopicId}/`,
        token,
        navigate,
        'POST',
        submissionData
      );

      if (response) {
        console.log('Successfully submitted to backend:', response);
      } else {
        console.error('Failed to submit to backend');
      }
    } catch (error) {
      console.error('Error submitting to backend:', error);
    }
  };

  const handleQuestionSelect = (index) => {
    if (index === currentQuestionIndex) return;
    
    setCurrentQuestionIndex(index);
    const submitted = submittedQuestions.find(sub => sub.questionIndex === index);
    
    if (submitted) {
      setCode(submitted.code);
      setTestResult(submitted);
    } else {
      setCode(CODE_TEMPLATES[selectedLanguage]);
      setTestResult(null);
    }
    setRunResult(null);
    setSidebarOpen(false);
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setSelectedLanguage(newLanguage);
    
    const isSubmitted = submittedQuestions.some(sub => sub.questionIndex === currentQuestionIndex);
    if (!isSubmitted) {
      setCode(CODE_TEMPLATES[newLanguage]);
    }
    
    setTestResult(null);
    setRunResult(null);
  };

  const handleFinalSubmit = () => {
    
    
    const finalResults = {
      sessionId,
      totalScore: score,
      maxScore: questions.length * 10,
      questionsAttempted: submittedQuestions.length,
      questionsTotal: questions.length,
      timeUsed: TIME_LIMIT - timeLeft,
      timeLimit: TIME_LIMIT,
      submissions: submittedQuestions.map(sub => ({
        dsaTopicId: sub.dsaTopicId,
        questionId: sub.questionId,
        topic: sub.topic,
        title: sub.title,
        code: sub.code,
        score: sub.score,
        passed: sub.allPassed,
        testsPassed: sub.passedTests,
        totalTests: sub.totalTests
      })),
      timestamp: new Date().toISOString()
    };
    
    console.log('Final Interview Results:', finalResults);
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-20 w-60 h-60 rounded-full bg-gradient-to-br from-[#E6E6FA] to-[#D8BFD8] blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-80 h-80 rounded-full bg-gradient-to-br from-[#D8BFD8] to-[#A020F0] blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A020F0] mx-auto mb-4"></div>
          <p className="text-lg text-black">Loading interview session...</p>
          <p className="text-sm text-gray-600 mt-2">Fetching DSA topics and generating questions</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-20 w-60 h-60 rounded-full bg-gradient-to-br from-[#E6E6FA] to-[#D8BFD8] blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-80 h-80 rounded-full bg-gradient-to-br from-[#D8BFD8] to-[#A020F0] blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        <div className="text-center bg-white p-8 rounded-3xl shadow-2xl border border-[#E6E6FA] max-w-md relative z-10 hover:shadow-[#E6E6FA] transition-all duration-700">
          <AlertCircle className="h-12 w-12 text-[#A020F0] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-black mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              initializeQuestions();
            }}
            className="px-4 py-2 bg-gradient-to-r from-[#D8BFD8] to-[#A020F0] hover:from-[#E6E6FA] hover:to-[#9370DB] text-white rounded-lg transition-all duration-300 shadow-lg hover:shadow-[#E6E6FA]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-20 w-60 h-60 rounded-full bg-gradient-to-br from-[#E6E6FA] to-[#D8BFD8] blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-80 h-80 rounded-full bg-gradient-to-br from-[#D8BFD8] to-[#A020F0] blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        <div className="text-center relative z-10">
          <p className="text-lg text-black">No questions available for this session.</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isSubmitted = submittedQuestions.some(sub => sub.questionIndex === currentQuestionIndex);

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-60 h-60 rounded-full bg-gradient-to-br from-[#E6E6FA] to-[#D8BFD8] blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 rounded-full bg-gradient-to-br from-[#D8BFD8] to-[#A020F0] blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] bg-gradient-to-br from-[#E6E6FA] to-[#9370DB] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      
      {/* Modern Header */}
      <div className="bg-white border-b border-[#E6E6FA] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-[#E6E6FA] transition-colors"
              >
                {sidebarOpen ? <X className="h-5 w-5 text-black" /> : <Menu className="h-5 w-5 text-black" />}
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-[#D8BFD8] to-[#A020F0] rounded-lg flex items-center justify-center">
                  <Code className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-[#A020F0] to-[#9370DB] bg-clip-text text-transparent">
                    InterXAI
                  </h1>
                  <p className="text-xs text-gray-600 -mt-1">AI-Powered Coding Interview</p>
                </div>
              </div>
            </div>

            {/* Timer and Score */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-full border border-[#E6E6FA]">
                <Clock className="h-4 w-4 text-[#A020F0]" />
                <span className={`text-sm font-mono font-bold ${
                  timeLeft < 300 ? 'text-red-500' : timeLeft < 600 ? 'text-orange-500' : 'text-[#A020F0]'
                }`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="bg-gradient-to-r from-[#D8BFD8] to-[#A020F0] text-white px-4 py-2 rounded-full text-sm font-semibold">
                Score: {score}/{questions.length * 10}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex relative z-10">
        {/* Sidebar - Question Navigation */}
        <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-30 w-80 bg-white border-r border-[#E6E6FA] h-[calc(100vh-4rem)] overflow-y-auto transition-transform duration-300`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-black">Challenge Progress</h2>
              <div className="bg-[#E6E6FA] text-[#A020F0] px-3 py-1 rounded-full text-sm font-medium">
                {submittedQuestions.length}/{questions.length}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-gradient-to-r from-[#D8BFD8] to-[#A020F0] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(submittedQuestions.length / questions.length) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-600">
                {Math.round((submittedQuestions.length / questions.length) * 100)}% Complete
              </p>
            </div>

            {/* Question List */}
            <div className="space-y-3">
              {questions.map((q, index) => {
                const submission = submittedQuestions.find(sub => sub.questionIndex === index);
                const isActive = currentQuestionIndex === index;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleQuestionSelect(index)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-[#E6E6FA] ${
                      isActive
                        ? 'bg-gradient-to-r from-[#D8BFD8] to-[#A020F0] text-white border-transparent shadow-lg transform scale-105'
                        : submission
                        ? submission.allPassed
                          ? 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100'
                          : 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100'
                        : 'bg-white text-black border-gray-200 hover:bg-gray-50 hover:border-[#D8BFD8]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`text-sm font-medium ${isActive ? 'text-white' : ''}`}>
                        Problem {index + 1}
                      </div>
                      {submission && (
                        <div className="flex items-center">
                          {submission.allPassed ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className={`font-semibold mb-1 text-sm ${isActive ? 'text-white' : 'text-black'}`}>
                      {q.title}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className={`text-xs ${isActive ? 'text-purple-100' : 'text-gray-600'}`}>
                        {q.topic}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : q.difficulty === 'Easy'
                          ? 'bg-green-100 text-green-700'
                          : q.difficulty === 'Medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {q.difficulty}
                      </div>
                    </div>
                    {submission && (
                      <div className={`text-xs mt-2 ${isActive ? 'text-white' : 'text-gray-600'}`}>
                        Score: {submission.score}/10 • {submission.passedTests}/{submission.totalTests} tests
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Stats Cards */}
            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-[#E6E6FA] to-[#D8BFD8] p-4 rounded-xl border border-[#D8BFD8]">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="h-4 w-4 text-[#A020F0]" />
                  <span className="text-xs font-medium text-[#A020F0]">Accuracy</span>
                </div>
                <div className="text-lg font-bold text-[#A020F0]">
                  {submittedQuestions.length > 0 
                    ? Math.round((submittedQuestions.filter(s => s.allPassed).length / submittedQuestions.length) * 100)
                    : 0}%
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-[#D8BFD8] to-[#A020F0] p-4 rounded-xl border border-[#A020F0]">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-white" />
                  <span className="text-xs font-medium text-white">Progress</span>
                </div>
                <div className="text-lg font-bold text-white">
                  {Math.round((submittedQuestions.length / questions.length) * 100)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/20 z-20"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          <div className="max-w-6xl mx-auto p-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Problem Panel */}
              <div className="bg-white rounded-2xl shadow-xl border border-[#E6E6FA] overflow-hidden hover:shadow-[#E6E6FA]">
                <div className="bg-gradient-to-r from-[#D8BFD8] to-[#A020F0] p-6 text-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">{currentQuestion.title}</h2>
                      <div className="flex items-center space-x-3">
                        <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                          {currentQuestion.difficulty}
                        </span>
                        <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                          {currentQuestion.topic}
                        </span>
                      </div>
                    </div>
                    {isSubmitted && (
                      <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
                        testResult.allPassed ? 'bg-green-500' : 'bg-orange-500'
                      }`}>
                        {testResult.allPassed ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                        <span className="font-medium">
                          {testResult.allPassed ? 'Solved' : 'Partial'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
                  <div>
                    <h3 className="font-semibold text-black mb-3 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2 text-[#A020F0]" />
                      Problem Statement
                    </h3>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50 p-4 rounded-lg">
                      {currentQuestion.description}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-black mb-3 flex items-center">
                      <Play className="h-4 w-4 mr-2 text-[#A020F0]" />
                      Sample Test Case
                    </h3>
                    <div className="bg-gradient-to-r from-[#E6E6FA] to-[#D8BFD8] rounded-lg p-4 space-y-2 font-mono text-sm border border-[#D8BFD8]">
                      <div><span className="text-[#A020F0] font-medium">Input:</span> <span className="text-black">{currentQuestion.sampleInput}</span></div>
                      <div><span className="text-[#A020F0] font-medium">Output:</span> <span className="text-black">{currentQuestion.sampleOutput}</span></div>
                    </div>
                  </div>

                  {currentQuestion.hints && (
                    <div>
                      <h3 className="font-semibold text-black mb-3 flex items-center">
                        <Zap className="h-4 w-4 mr-2 text-[#A020F0]" />
                        Hints
                      </h3>
                      <ul className="list-disc pl-5 space-y-1 text-gray-700">
                        {currentQuestion.hints.map((hint, idx) => (
                          <li key={idx}>{hint}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {runResult && (
                    <div className="bg-gradient-to-r from-[#E6E6FA] to-[#D8BFD8] rounded-lg p-4 border border-[#D8BFD8]">
                      <h4 className="font-medium text-black mb-3 flex items-center">
                        <Zap className="h-4 w-4 mr-2 text-[#A020F0]" />
                        Execution Result ({runsLeft[currentQuestionIndex] || 0} runs remaining)
                      </h4>
                      {runResult.isOutput ? (
                        <div className="space-y-3">
                          <div className="bg-white p-3 rounded border-l-4 border-[#A020F0] font-mono text-sm">
                            <div className="text-[#A020F0] text-xs mb-1 font-medium">Your Output:</div>
                            <div className="text-black">{runResult.message}</div>
                          </div>
                          <div className="bg-white p-3 rounded border-l-4 border-[#A020F0] font-mono text-sm">
                            <div className="text-[#A020F0] text-xs mb-1 font-medium">Expected:</div>
                            <div className="text-black">{runResult.expected}</div>
                          </div>
                          <div className={`text-sm font-medium ${
                            runResult.message.trim() === runResult.expected.trim() 
                              ? 'text-green-600' : 'text-orange-600'
                          }`}>
                            {String(runResult.message).trim() === String(runResult.expected).trim()
                              ? '✓ Perfect match!' 
                              : '⚠ Output differs from expected'}
                          </div>
                        </div>
                      ) : (
                        <div className="text-red-600 text-sm font-medium">{runResult.message}</div>
                      )}
                    </div>
                  )}

                  {testResult && (
                    <div className={`p-4 rounded-lg border-2 ${
                      testResult.allPassed 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-orange-50 border-orange-200'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {testResult.allPassed ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-orange-600" />
                          )}
                          <span className={`font-bold ${testResult.allPassed ? 'text-green-800' : 'text-orange-800'}`}>
                            {testResult.allPassed ? 'All Tests Passed!' : 'Partial Success'}
                          </span>
                        </div>
                        <span className={`font-bold ${testResult.allPassed ? 'text-green-800' : 'text-orange-800'}`}>
                          {testResult.passedTests}/{testResult.totalTests}
                        </span>
                      </div>
                      <div className={`text-sm font-medium ${testResult.allPassed ? 'text-green-700' : 'text-orange-700'}`}>
                        Score Earned: <span className="font-bold">{testResult.score}/10 points</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Code Editor Panel */}
              <div className="bg-white rounded-2xl shadow-xl border border-[#E6E6FA] overflow-hidden hover:shadow-[#E6E6FA]">
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      </div>
                      <h3 className="text-white font-medium flex items-center">
                        <Code className="h-4 w-4 mr-2" />
                        Code Editor
                      </h3>
                    </div>
                    <select
                      value={selectedLanguage}
                      onChange={handleLanguageChange}
                      className="bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#A020F0]"
                      disabled={isSubmitted}
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="p-6">
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-80 bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm resize-none border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#A020F0] focus:border-transparent"
                    placeholder="Write your solution here..."
                    disabled={isSubmitted}
                    style={{ fontFamily: 'Monaco, Consolas, "Courier New", monospace' }}
                  />
                  
                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={runSingleTest}
                      disabled={isTestRunning || isSubmitted || !code.trim() || (runsLeft[currentQuestionIndex] || 0) <= 0}
                      className="flex items-center px-6 py-3 bg-gradient-to-r from-[#D8BFD8] to-[#A020F0] text-white rounded-xl hover:from-[#E6E6FA] hover:to-[#9370DB] disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-[#E6E6FA] transform hover:-translate-y-0.5"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {isTestRunning ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          Running...
                        </>
                      ) : (
                        `Run Code (${runsLeft[currentQuestionIndex] || 0} left)`
                      )}
                    </button>
                    
                    <button
                      onClick={submitQuestion}
                      disabled={isTestRunning || isSubmitted || !code.trim()}
                      className="flex items-center px-6 py-3 bg-gradient-to-r from-[#A020F0] to-[#9370DB] text-white rounded-xl hover:from-[#D8BFD8] hover:to-[#A020F0] disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-[#E6E6FA] transform hover:-translate-y-0.5"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isTestRunning ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          Testing...
                        </>
                      ) : isSubmitted ? (
                        'Submitted ✓'
                      ) : (
                        'Submit Solution'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Final Submit Banner */}
            {submittedQuestions.length > 0 && (
              <div className="mt-8 bg-white rounded-2xl shadow-2xl border border-[#E6E6FA] overflow-hidden hover:shadow-[#E6E6FA]">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-black mb-2">Ready to Submit?</h3>
                      <p className="text-gray-600">
                        {submittedQuestions.length} of {questions.length} problems completed • 
                        Total Score: {score}/{questions.length * 10} points
                      </p>
                    </div>
                    
                    <button
                      onClick={handleFinalSubmit}
                      className="px-8 py-4 bg-gradient-to-r from-[#D8BFD8] to-[#A020F0] text-white rounded-xl hover:from-[#E6E6FA] hover:to-[#9370DB] font-bold transition-all duration-200 shadow-lg hover:shadow-[#E6E6FA] transform hover:-translate-y-0.5"
                      disabled={isTestRunning}
                    >
                      <div className="flex items-center space-x-2">
                        <Send className="h-5 w-5" />
                        <span>Final Submit</span>
                      </div>
                    </button>
                  </div>
                  
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-[#D8BFD8] to-[#A020F0] h-3 rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: `${(submittedQuestions.length / questions.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Feature Cards */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-6 bg-white rounded-2xl border border-[#E6E6FA] hover:shadow-[#E6E6FA]">
                <div className="w-12 h-12 bg-gradient-to-r from-[#D8BFD8] to-[#A020F0] rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-black mb-2">AI Mock Interviews</h3>
                <p className="text-sm text-gray-600">Practice with intelligent AI that adapts to your skill level</p>
              </div>

              <div className="text-center p-6 bg-white rounded-2xl border border-[#E6E6FA] hover:shadow-[#E6E6FA]">
                <div className="w-12 h-12 bg-gradient-to-r from-[#D8BFD8] to-[#A020F0] rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-black mb-2">Real-Time Feedback</h3>
                <p className="text-sm text-gray-600">Get instant feedback on your code and approach</p>
              </div>

              <div className="text-center p-6 bg-white rounded-2xl border border-[#E6E6FA] hover:shadow-[#E6E6FA]">
                <div className="w-12 h-12 bg-gradient-to-r from-[#D8BFD8] to-[#A020F0] rounded-xl flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-black mb-2">Industry Preparation</h3>
                <p className="text-sm text-gray-600">Questions from top tech companies and startups</p>
              </div>

              <div className="text-center p-6 bg-white rounded-2xl border border-[#E6E6FA] hover:shadow-[#E6E6FA]">
                <div className="w-12 h-12 bg-gradient-to-r from-[#D8BFD8] to-[#A020F0] rounded-xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-black mb-2">Performance Analytics</h3>
                <p className="text-sm text-gray-600">Track progress and identify areas for improvement</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 text-center text-gray-600 text-sm">
              <p>© 2024 InterXAI - Master Every Interview with AI Coaching</p>
              <div className="mt-2 space-x-4">
                <a href="#" className="hover:text-[#A020F0] transition-colors">Features</a>
                <a href="#" className="hover:text-[#A020F0] transition-colors">How It Works</a>
                <a href="#" className="hover:text-[#A020F0] transition-colors">Resources</a>
                <a href="#" className="hover:text-[#A020F0] transition-colors">Login</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DSAInterviewPlatform;