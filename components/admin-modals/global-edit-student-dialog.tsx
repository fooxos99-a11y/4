"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { UserPen } from "lucide-react"

interface Circle {
	id: string
	name: string
}

interface Student {
	id: string
	name: string
	guardian_phone?: string | null
	id_number?: string | null
	account_number?: string | number | null
	halaqah?: string | null
	circle_name?: string | null
}

const getStudentCircleName = (student: Student) => (student.halaqah || student.circle_name || "غير محدد").trim()

export function GlobalEditStudentDialog() {
	const router = useRouter()
	const pathname = usePathname()
	const { toast } = useToast()

	const [isOpen, setIsOpen] = useState(true)
	const [circles, setCircles] = useState<Circle[]>([])
	const [studentsInCircles, setStudentsInCircles] = useState<Record<string, Student[]>>({})
	const [selectedCircleForEdit, setSelectedCircleForEdit] = useState("")
	const [selectedStudentForEdit, setSelectedStudentForEdit] = useState("")
	const [editingStudent, setEditingStudent] = useState<Student | null>(null)
	const [editStudentName, setEditStudentName] = useState("")
	const [editStudentHalaqah, setEditStudentHalaqah] = useState("")
	const [editGuardianPhone, setEditGuardianPhone] = useState("")
	const [editStudentIdNumber, setEditStudentIdNumber] = useState("")
	const [editStudentAccountNumber, setEditStudentAccountNumber] = useState("")
	const [isSubmitting, setIsSubmitting] = useState(false)

	const availableCircles = Array.from(
		new Set([
			...circles.map((circle) => circle.name.trim()),
			...Object.keys(studentsInCircles).map((circleName) => circleName.trim()),
		].filter(Boolean)),
	).sort((first, second) => first.localeCompare(second, "ar"))

	useEffect(() => {
		fetchData()
	}, [])

	const fetchData = async () => {
		try {
			const [circlesRes, studentsRes] = await Promise.all([
				fetch("/api/circles", { cache: "no-store" }),
				fetch("/api/students", { cache: "no-store" }),
			])

			const circlesData = await circlesRes.json()
			const studentsData = await studentsRes.json()

			if (circlesRes.ok && circlesData.circles) {
				setCircles(circlesData.circles)
			}

			if (studentsRes.ok && studentsData.students) {
				const grouped: Record<string, Student[]> = {}
				studentsData.students.forEach((student: Student) => {
					const circleName = getStudentCircleName(student)
					if (!grouped[circleName]) {
						grouped[circleName] = []
					}
					grouped[circleName].push(student)
				})
				setStudentsInCircles(grouped)
			}
		} catch (error) {
			console.error("Error fetching edit-student data:", error)
		}
	}

	const handleClose = (open: boolean) => {
		setIsOpen(open)
		if (!open) {
			setTimeout(() => {
				router.push(pathname || "/")
			}, 300)
		}
	}

	const handleSelectStudentForEdit = (studentId: string) => {
		setSelectedStudentForEdit(studentId)
		const student = (studentsInCircles[selectedCircleForEdit] || []).find((item) => item.id === studentId) || null
		setEditingStudent(student)
		setEditStudentName(student?.name || "")
		setEditStudentHalaqah(student ? getStudentCircleName(student) : "")
		setEditGuardianPhone(student?.guardian_phone || "")
		setEditStudentIdNumber(student?.id_number || "")
		setEditStudentAccountNumber(student?.account_number != null ? String(student.account_number) : "")
	}

	const handleSaveStudentEdit = async () => {
		if (!editingStudent) return

		setIsSubmitting(true)
		try {
			const response = await fetch("/api/students", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					id: editingStudent.id,
					name: editStudentName,
					halaqah: editStudentHalaqah,
					guardian_phone: editGuardianPhone,
					id_number: editStudentIdNumber,
					account_number: editStudentAccountNumber.trim() || null,
				}),
			})

			const data = await response.json()

			if (!data.success) {
				throw new Error(data.error || "فشل في تحديث الطالب")
			}

			toast({
				title: "✓ تم الحفظ بنجاح",
				description: `تم تحديث معلومات الطالب ${editingStudent.name} بنجاح`,
				className: "bg-gradient-to-r from-[#3453a7] to-[#4f73d1] text-white border-none",
			})

			setEditingStudent(null)
			setSelectedStudentForEdit("")
			setSelectedCircleForEdit("")
			setEditStudentName("")
			setEditStudentHalaqah("")
			setEditGuardianPhone("")
			setEditStudentIdNumber("")
			setEditStudentAccountNumber("")
			await fetchData()
			handleClose(false)
		} catch (error) {
			console.error("Error updating student:", error)
			toast({
				title: "حدث خطأ",
				description: error instanceof Error ? error.message : "حدث خطأ أثناء تحديث الطالب",
				variant: "destructive",
			})
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[425px]" dir="rtl">
				<DialogHeader>
					<DialogTitle className="relative w-full text-center text-xl text-[#1a2332]">
						<UserPen className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3453a7]" />
						<span>تعديل بيانات الطالب</span>
					</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="space-y-2">
						<Label className="text-sm font-medium text-neutral-600">اختر الحلقة</Label>
						<Select
							value={selectedCircleForEdit}
							onValueChange={(value) => {
								setSelectedCircleForEdit(value)
								setSelectedStudentForEdit("")
								setEditingStudent(null)
								setEditStudentName("")
								setEditStudentHalaqah("")
								setEditGuardianPhone("")
								setEditStudentIdNumber("")
								setEditStudentAccountNumber("")
							}}
							dir="rtl"
						>
							<SelectTrigger className="w-full text-base">
								<SelectValue placeholder="اختر الحلقة" />
							</SelectTrigger>
							<SelectContent dir="rtl">
								{availableCircles.map((circleName) => (
									<SelectItem key={circleName} value={circleName}>
										{circleName}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label className="text-sm font-medium text-neutral-600">اختر الطالب</Label>
						<Select value={selectedStudentForEdit} onValueChange={handleSelectStudentForEdit} disabled={!selectedCircleForEdit} dir="rtl">
							<SelectTrigger className="w-full text-base">
								<SelectValue placeholder={selectedCircleForEdit ? "اختر الطالب" : "اختر الحلقة أولاً"} />
							</SelectTrigger>
							<SelectContent dir="rtl">
								{(studentsInCircles[selectedCircleForEdit] || []).map((student) => (
									<SelectItem key={student.id} value={student.id}>
										{student.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{editingStudent && (
						<>
							<div className="space-y-2">
								<Label className="text-sm font-medium text-neutral-600">اسم الطالب</Label>
								<Input
									value={editStudentName}
									onChange={(event) => setEditStudentName(event.target.value)}
									placeholder="أدخل اسم الطالب"
									className="text-sm"
								/>
							</div>
							<div className="space-y-2">
								<Label className="text-sm font-medium text-neutral-600">الحلقة</Label>
								<Select value={editStudentHalaqah} onValueChange={setEditStudentHalaqah} dir="rtl">
									<SelectTrigger className="w-full text-base">
										<SelectValue placeholder="اختر الحلقة" />
									</SelectTrigger>
									<SelectContent dir="rtl">
										{availableCircles.map((circleName) => (
											<SelectItem key={circleName} value={circleName}>
												{circleName}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label className="text-sm font-medium text-neutral-600">رقم الهوية</Label>
								<Input
									value={editStudentIdNumber}
									onChange={(event) => setEditStudentIdNumber(event.target.value)}
									placeholder="أدخل رقم الهوية"
									className="text-sm"
									dir="ltr"
								/>
							</div>
							<div className="space-y-2">
								<Label className="text-sm font-medium text-neutral-600">رقم الحساب</Label>
								<Input
									value={editStudentAccountNumber}
									onChange={(event) => setEditStudentAccountNumber(event.target.value)}
									placeholder="أدخل رقم الحساب"
									className="text-sm"
									dir="ltr"
								/>
							</div>
							<div className="space-y-2">
								<Label className="text-sm font-medium text-neutral-600">رقم جوال ولي الأمر</Label>
								<Input
									value={editGuardianPhone}
									onChange={(event) => setEditGuardianPhone(event.target.value)}
									placeholder="0555555555"
									className="text-sm"
									dir="ltr"
								/>
								<p className="text-xs text-gray-500">مثال: 0555555555</p>
							</div>
						</>
					)}
				</div>
				<div className="flex justify-end gap-2">
					<Button
						variant="outline"
						onClick={() => handleClose(false)}
						className="text-sm h-9 rounded-lg border-[#3453a7]/50 text-neutral-600"
					>
						إلغاء
					</Button>
					<Button
						onClick={handleSaveStudentEdit}
						className="bg-[#3453a7] hover:bg-[#24428f] text-white border-none text-sm h-9 rounded-lg font-medium disabled:bg-[#8ea2df] disabled:text-white disabled:opacity-100 disabled:cursor-not-allowed"
						disabled={!editingStudent || isSubmitting}
					>
						{isSubmitting ? "جاري الحفظ..." : "حفظ التعديلات"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
