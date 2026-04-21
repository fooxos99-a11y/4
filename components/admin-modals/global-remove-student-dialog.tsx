"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { UserMinus } from "lucide-react"

interface Circle {
	id: string
	name: string
}

interface Student {
	id: string
	name: string
	halaqah?: string | null
	circle_name?: string | null
}

const getStudentCircleName = (student: Student) => (student.halaqah || student.circle_name || "غير محدد").trim()

export function GlobalRemoveStudentDialog() {
	const router = useRouter()
	const pathname = usePathname()
	const { toast } = useToast()
	const confirmDialog = useConfirmDialog()

	const [isOpen, setIsOpen] = useState(true)
	const [circles, setCircles] = useState<Circle[]>([])
	const [studentsInCircles, setStudentsInCircles] = useState<Record<string, Student[]>>({})
	const [selectedCircleToRemove, setSelectedCircleToRemove] = useState("")
	const [selectedStudentToRemove, setSelectedStudentToRemove] = useState("")
	const [isSubmitting, setIsSubmitting] = useState(false)

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
			console.error("Error fetching remove-student data:", error)
		}
	}

	const availableStudentsToRemove = selectedCircleToRemove ? studentsInCircles[selectedCircleToRemove] || [] : []

	const handleClose = (open: boolean) => {
		setIsOpen(open)
		if (!open) {
			setTimeout(() => {
				router.push(pathname || "/")
			}, 300)
		}
	}

	const handleRemoveStudent = async () => {
		if (!selectedStudentToRemove) return

		const studentName = availableStudentsToRemove.find((student) => student.id === selectedStudentToRemove)?.name
		const confirmed = await confirmDialog({
			title: "تأكيد إزالة الطالب",
			description: `هل أنت متأكد من إزالة الطالب ${studentName || ""}؟`,
			confirmText: "إزالة",
			cancelText: "إلغاء",
		})

		if (!confirmed) return

		setIsSubmitting(true)
		try {
			const response = await fetch(`/api/students?id=${selectedStudentToRemove}`, {
				method: "DELETE",
			})

			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.error || "فشل في إزالة الطالب")
			}

			toast({
				title: "✓ تم الحذف بنجاح",
				description: `تم إزالة الطالب ${studentName} من ${selectedCircleToRemove} بنجاح`,
				className: "bg-gradient-to-r from-[#3453a7] to-[#4f73d1] text-white border-none",
			})

			setSelectedStudentToRemove("")
			await fetchData()
		} catch (error) {
			console.error("Error removing student:", error)
			toast({
				title: "حدث خطأ",
				description: error instanceof Error ? error.message : "حدث خطأ أثناء إزالة الطالب",
				variant: "destructive",
			})
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[425px]" dir="rtl">
				<DialogHeader className="space-y-0 text-right">
					<DialogTitle className="relative w-full text-center text-xl text-[#1a2332]">
						<UserMinus className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 text-[#4f73d1]" />
						<span>إزالة طالب</span>
					</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="space-y-2">
						<Label className="text-sm font-medium text-neutral-600">اختر الحلقة</Label>
						<Select
							value={selectedCircleToRemove}
							onValueChange={(value) => {
								setSelectedCircleToRemove(value)
								setSelectedStudentToRemove("")
							}}
							dir="rtl"
						>
							<SelectTrigger className="w-full text-sm">
								<SelectValue placeholder="اختر الحلقة" />
							</SelectTrigger>
							<SelectContent dir="rtl">
								{circles.map((circle) => (
									<SelectItem key={circle.id} value={circle.name}>
										{circle.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label className="text-sm font-semibold text-[#1a2332]">اختر الطالب</Label>
						<Select value={selectedStudentToRemove} onValueChange={setSelectedStudentToRemove} disabled={!selectedCircleToRemove} dir="rtl">
							<SelectTrigger className="w-full text-sm">
								<SelectValue placeholder={selectedCircleToRemove ? "اختر الطالب" : "اختر الحلقة أولاً"} />
							</SelectTrigger>
							<SelectContent dir="rtl">
								{availableStudentsToRemove.map((student) => (
									<SelectItem key={student.id} value={student.id}>
										{student.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
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
						onClick={handleRemoveStudent}
						className="text-sm h-9 rounded-lg bg-[#3453a7] hover:bg-[#24428f] text-white border-none font-medium disabled:bg-[#8ea2df] disabled:text-white disabled:opacity-100 disabled:cursor-not-allowed"
						disabled={!selectedStudentToRemove || !selectedCircleToRemove || isSubmitting}
					>
						{isSubmitting ? "جاري الإزالة..." : "إزالة"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
