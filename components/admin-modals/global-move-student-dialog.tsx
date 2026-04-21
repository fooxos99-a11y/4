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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { ArrowRightLeft } from "lucide-react"

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

export function GlobalMoveStudentDialog() {
	const router = useRouter()
	const pathname = usePathname()
	const { toast } = useToast()

	const [isOpen, setIsOpen] = useState(true)
	const [circles, setCircles] = useState<Circle[]>([])
	const [studentsInCircles, setStudentsInCircles] = useState<Record<string, Student[]>>({})
	const [moveSourceCircle, setMoveSourceCircle] = useState("")
	const [moveStudentId, setMoveStudentId] = useState("")
	const [moveTargetCircle, setMoveTargetCircle] = useState("")
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
			console.error("Error fetching move-student data:", error)
		}
	}

	const availableStudentsToMove = moveSourceCircle ? studentsInCircles[moveSourceCircle] || [] : []

	const handleClose = (open: boolean) => {
		setIsOpen(open)
		if (!open) {
			setTimeout(() => {
				router.push(pathname || "/")
			}, 300)
		}
	}

	const handleMoveStudent = async () => {
		if (!moveStudentId || !moveTargetCircle) return

		setIsSubmitting(true)
		try {
			const response = await fetch(`/api/students?id=${moveStudentId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ halaqah: moveTargetCircle }),
			})

			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.error || "فشل في نقل الطالب")
			}

			const studentName = availableStudentsToMove.find((student) => student.id === moveStudentId)?.name
			toast({
				title: "✓ تم النقل بنجاح",
				description: `تم نقل الطالب ${studentName} إلى ${moveTargetCircle} بنجاح`,
				className: "bg-gradient-to-r from-[#3453a7] to-[#4f73d1] text-white border-none",
			})

			setMoveStudentId("")
			setMoveSourceCircle("")
			setMoveTargetCircle("")
			await fetchData()
			handleClose(false)
		} catch (error) {
			console.error("Error moving student:", error)
			toast({
				title: "حدث خطأ",
				description: error instanceof Error ? error.message : "فشل في الاتصال بالخادم",
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
						<ArrowRightLeft className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3453a7]" />
						<span>نقل طالب</span>
					</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="space-y-2">
						<Label className="text-sm font-medium text-neutral-600">الحلقة الحالية</Label>
						<Select
							value={moveSourceCircle}
							onValueChange={(value) => {
								setMoveSourceCircle(value)
								setMoveStudentId("")
								setMoveTargetCircle("")
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
						<Select value={moveStudentId} onValueChange={setMoveStudentId} disabled={!moveSourceCircle} dir="rtl">
							<SelectTrigger className="w-full text-sm">
								<SelectValue placeholder={moveSourceCircle ? "اختر الطالب" : "اختر الحلقة أولاً"} />
							</SelectTrigger>
							<SelectContent dir="rtl">
								{availableStudentsToMove.map((student) => (
									<SelectItem key={student.id} value={student.id}>
										{student.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label className="text-sm font-semibold text-[#1a2332]">الحلقة المراد النقل إليها</Label>
						<Select value={moveTargetCircle} onValueChange={setMoveTargetCircle} disabled={!moveStudentId} dir="rtl">
							<SelectTrigger className="w-full text-sm">
								<SelectValue placeholder={moveStudentId ? "اختر الحلقة الجديدة" : "اختر الطالب أولاً"} />
							</SelectTrigger>
							<SelectContent dir="rtl">
								{circles
									.filter((circle) => circle.name !== moveSourceCircle)
									.map((circle) => (
										<SelectItem key={circle.id} value={circle.name}>
											{circle.name}
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
						onClick={handleMoveStudent}
						className="text-sm h-9 rounded-lg font-medium bg-[#3453a7] hover:bg-[#24428f] text-white border-none disabled:bg-[#8ea2df] disabled:text-white disabled:opacity-100 disabled:cursor-not-allowed"
						disabled={!moveStudentId || !moveTargetCircle || isSubmitting}
					>
						{isSubmitting ? "جاري النقل..." : "حفظ"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
