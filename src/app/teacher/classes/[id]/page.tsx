'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import TeacherHeader from '../../components/teacherHeader'

interface StudentGrade {
  studentId: number;
  name: string;
  assessment_1: number;
  assessment_2: number;
  midterm: number;
  final_exam: number;
}

export default function ClassDetailsPage() {
  const params = useParams();
  const assignmentId = params.id; // This comes from the URL
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [classTitle, setClassTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weights, setWeights] = useState({ weight_1: 25, weight_2: 25, weight_mid: 25, weight_final: 25 });

  // FETCH DATA
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/teacher/studentGrades?assignment_id=${assignmentId}`);
        const data = await res.json();
        if (data.success) {
          setStudents(data.students);
          setClassTitle(`${data.className} - ${data.subjectName}`);
          setWeights(data.weights);
        }
      } catch {
        console.error("An error occurred");
      } finally {
        setLoading(false);
      }
    };
    if (assignmentId) fetchData();
  }, [assignmentId]);

  // HANDLE INPUT CHANGE
  const handleGradeChange = (index: number, field: string, value: string) => {
    const newStudents = [...students];
    // @ts-ignore
    newStudents[index][field] = parseFloat(value) || 0;
    setStudents(newStudents);
  };

  // SAVE DATA
  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/teacher/studentGrades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, grades: students })
      });
      alert('Grades saved successfully!');
    } catch (err) {
      alert('Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  // HELPER: Calculate Final Score & Grade
  const calculateStats = (s: StudentGrade) => {
    // FORMULA: (Score * Weight) / 100
    // This now uses the dynamic weights from the database instead of hardcoded 25%
    const w1 = (s.assessment_1 * weights.weight_1) / 100;
    const w2 = (s.assessment_2 * weights.weight_2) / 100;
    const mid = (s.midterm * weights.weight_mid) / 100;
    const fin = (s.final_exam * weights.weight_final) / 100;
    
    const total = w1 + w2 + mid + fin;
    
    let grade = 'F';
    if (total >= 90) grade = 'A+';
    else if (total >= 80) grade = 'A';
    else if (total >= 70) grade = 'B';
    else if (total >= 60) grade = 'C';
    else if (total >= 50) grade = 'D';

    return { score: total.toFixed(1), grade };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherHeader />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{classTitle || 'Loading...'}</h2>
            <p className="text-sm text-blue-600 mt-1">Enter grades for each student. Scores calculate automatically.</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:bg-blue-300"
          >
            {saving ? 'Saving...' : 'Save Grades'}
          </button>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading student list...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-600 font-semibold">
                    <th className="py-4 px-6">Student Name</th>
                    <th className="py-4 px-6 w-32">Assess 1</th>
                    <th className="py-4 px-6 w-32">Assess 2</th>
                    <th className="py-4 px-6 w-32">Midterm</th>
                    <th className="py-4 px-6 w-32">Final Exam</th>
                    <th className="py-4 px-6 bg-gray-50">Final Score</th>
                    <th className="py-4 px-6 bg-gray-50">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((student, index) => {
                    const stats = calculateStats(student);
                    return (
                      <tr key={student.studentId} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6 font-medium text-gray-900">
                          {student.name}
                        </td>
                        
                        {/* Input Fields */}
                        {['assessment_1', 'assessment_2', 'midterm', 'final_exam'].map((field) => (
                          <td key={field} className="py-3 px-4">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              // @ts-ignore
                              value={student[field] || ''} 
                              // @ts-ignore
                              onChange={(e) => handleGradeChange(index, field, e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-blue-600 font-medium text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          </td>
                        ))}

                        {/* Calculated Fields */}
                        <td className="py-4 px-6 font-bold text-gray-700 bg-gray-50/50">
                          {stats.score}
                        </td>
                        <td className={`py-4 px-6 font-bold ${stats.grade.startsWith('A') ? 'text-green-600' : 'text-blue-600'} bg-gray-50/50`}>
                          {stats.grade}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}