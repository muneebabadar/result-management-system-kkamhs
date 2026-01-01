'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, ChevronDown, Download, FileText, Loader2 } from 'lucide-react'
import AdminHeader from '../components/adminHeader'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

// --- Types ---
type ReportType = 'individual' | 'class-wise' | 'annual'

type ClassSection = {
  id: number
  classes: { name: string } | { name: string }[] | null
  sections: { name: string } | { name: string }[] | null
}

type Student = {
  id: number
  full_name: string
}

export default function GenerateReports() {
  // --- State ---
  const [reportType, setReportType] = useState<ReportType>('individual')
  
  // Data State
  const [classes, setClasses] = useState<ClassSection[]>([])
  const [students, setStudents] = useState<Student[]>([])
  
  // Loading State
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)

  // Selection State
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Generation State
  const [generating, setGenerating] = useState(false)
  const [loadingText, setLoadingText] = useState('Generate Report')

  // --- Helper to safely get names from joined data ---
  const getJoinedName = (data: any) => {
    if (!data) return ''
    if (Array.isArray(data)) return data[0]?.name || ''
    return data.name || ''
  }

  // --- 1. Fetch Classes on Mount (FROM API ROUTE) ---
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        console.log('Fetching classes from API...')
        
        const response = await fetch('/api/admin/classes')
        const result = await response.json()

        console.log('Classes response:', result)

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch classes')
        }

        if (result.data) setClasses(result.data)
      } catch (err) {
        console.error('Error fetching classes:', err)
      } finally {
        setLoadingClasses(false)
      }
    }
    fetchClasses()
  }, [])

  // --- 2. Fetch Students when Class Changes (FROM API ROUTE) ---
  useEffect(() => {
    setSelectedStudentId('')
    setStudents([])

    if (!selectedClassId) return

    const fetchStudents = async () => {
      setLoadingStudents(true)
      try {
        console.log('Fetching students for class:', selectedClassId)
        
        const response = await fetch(`/api/admin/students?classId=${selectedClassId}`)
        const result = await response.json()

        console.log('Students response:', result)

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch students')
        }

        if (result.data) setStudents(result.data)
      } catch (err) {
        console.error('Error fetching students:', err)
      } finally {
        setLoadingStudents(false)
      }
    }

    fetchStudents()
  }, [selectedClassId])

  // --- Main Report Logic ---
  const handleGenerate = async () => {
    if (!selectedClassId) return
    setGenerating(true)
    setLoadingText('Fetching Data...')

    try {
      // Fetch Data from Secure API Route
      const res = await fetch(`/api/admin/reports?classId=${selectedClassId}`, { 
        cache: 'no-store' 
      })
      const result = await res.json()

      if (!res.ok) throw new Error(result.error || 'Failed to fetch report data')

      // Filter: If a specific student is selected, only keep them
      let enrollments = result.data
      if (selectedStudentId) {
        enrollments = enrollments.filter((e: any) => e.students.id === Number(selectedStudentId))
      }

      if (!enrollments || enrollments.length === 0) {
        alert('No data found for the selected criteria.')
        setGenerating(false)
        return
      }

      // Generate PDFs and Zip (rest of your logic stays the same)
      const zip = new JSZip()
      const folderName = `Reports_Class_${selectedClassId}`
      const folder = zip.folder(folderName)

      enrollments.forEach((record: any, index: number) => {
        setLoadingText(`Generating ${index + 1}/${enrollments.length}...`)
        
        const doc = new jsPDF()
        // const studentName = record.students?.full_name || 'Unknown'
        const studentObj = Array.isArray(record.students) ? record.students[0] : record.students
        const studentName = studentObj?.full_name || 'Unknown'
        
        doc.setFontSize(18)
        doc.text('Khadija Kazi Ali Memorial High School', 105, 15, { align: 'center' })
        doc.setFontSize(12)
        doc.text('Academic Report Card', 105, 22, { align: 'center' })

        doc.setFontSize(10)
        doc.text(`Student Name: ${studentName}`, 14, 35)
        doc.text(`Roll Number: ${record.roll_number || 'N/A'}`, 14, 40)
        
        const selectedClassObj = classes.find(c => c.id === Number(selectedClassId))
        const className = getJoinedName(selectedClassObj?.classes)
        const sectionName = getJoinedName(selectedClassObj?.sections)
        
        doc.text(`Class: ${className} - ${sectionName}`, 14, 45)

        // const grades = record.student_grades || []
        const grades = studentObj?.student_grades || []
        const tableBody = grades.map((g: any) => [
        //   g.subjects?.name || 'Subject',
          (Array.isArray(g.subjects) ? g.subjects[0]?.name : g.subjects?.name) || 'Subject',
          g.marks_obtained || 0,
          g.marks_obtained >= 40 ? 'Pass' : 'Fail'
        ])

        autoTable(doc, {
          startY: 55,
          head: [['Subject', 'Marks Obtained', 'Status']],
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor: [23, 23, 23] }
        })

        doc.text('__________________', 14, doc.internal.pageSize.height - 30)
        doc.text('Principal Signature', 14, doc.internal.pageSize.height - 25)

        const pdfBlob = doc.output('blob')
        const cleanName = studentName.replace(/[^a-z0-9]/gi, '_')
        const fileName = `${record.roll_number}_${cleanName}.pdf`
        folder?.file(fileName, pdfBlob)
      })

      setLoadingText('Zipping & Downloading...')
      const content = await zip.generateAsync({ type: 'blob' })
      saveAs(content, `${folderName}.zip`)

    } catch (err: any) {
      console.error(err)
      alert('Error: ' + err.message)
    } finally {
      setGenerating(false)
      setLoadingText('Generate Report')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      
      <main className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          
          {/* Header */}
          <h1 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Generate Reports
          </h1>

          {/* Report Type Toggle */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Report Type</label>
            <div className="flex flex-wrap gap-3">
              {['Individual Student Report', 'Class-wise Report', 'Annual Report'].map((label) => {
                 const typeKey = label.split(' ')[0].toLowerCase() as ReportType
                 const isActive = reportType === typeKey || (label === 'Individual Student Report' && reportType === 'individual')
                 return (
                   <button
                     key={label}
                     onClick={() => setReportType(typeKey)}
                     className={`px-5 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                       isActive ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                     }`}
                   >
                     {label}
                   </button>
                 )
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            
            {/* 1. SELECT CLASS */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Class {loadingClasses && <span className="text-xs text-gray-400 ml-2">(Loading...)</span>}
              </label>
              <div className="relative">
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  disabled={loadingClasses}
                  className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 cursor-pointer disabled:bg-gray-50"
                >
                  <option value="">Select Class</option>
                  {classes.map((c) => {
                    const className = getJoinedName(c.classes)
                    const sectionName = getJoinedName(c.sections)
                    return (
                      <option key={c.id} value={c.id}>
                        {className} {sectionName ? `- ${sectionName}` : ''}
                      </option>
                    )
                  })}
                </select>
                <ChevronDown className="absolute right-4 top-3.5 text-gray-400 pointer-events-none" size={16} />
              </div>
            </div>

            {/* 2. SELECT STUDENT */}
            <div className={`transition-opacity ${reportType === 'class-wise' ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Student {loadingStudents && <span className="text-xs text-gray-400 ml-2">(Loading...)</span>}
                {!selectedClassId && <span className="text-xs text-gray-400 ml-2">(Choose class first)</span>}
              </label>
              <div className="relative">
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={!selectedClassId || reportType === 'class-wise' || loadingStudents}
                  className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 cursor-pointer disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">All Students</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
                {loadingStudents ? (
                   <Loader2 className="absolute right-4 top-3.5 text-gray-400 animate-spin" size={16} />
                ) : (
                   <ChevronDown className="absolute right-4 top-3.5 text-gray-400 pointer-events-none" size={16} />
                )}
              </div>
            </div>

            {/* Date Inputs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
                {!startDate && <Calendar className="absolute right-4 top-3.5 text-gray-400 pointer-events-none" size={18} />}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
                {!endDate && <Calendar className="absolute right-4 top-3.5 text-gray-400 pointer-events-none" size={18} />}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-6 border-t border-gray-100">
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedClassId}
              className={`flex items-center gap-2 px-8 py-3 rounded-lg font-medium text-white transition-all shadow-md ${
                generating || !selectedClassId ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-800'
              }`}
            >
              {generating ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>{loadingText}</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  Download Reports
                </>
              )}
            </button>
          </div>

        </div>
      </main>
    </div>
  )
}