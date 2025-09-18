"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Heart, Users, Video, TrendingUp, Bell } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DashboardData {
  nextPeriod?: Date
  cycleDay?: number
  recentMood?: number
  consultationsThisMonth?: number
  unreadNotifications?: number
  premiumFeatures?: boolean
}

export default function DashboardPage() {
  const { user, loading, token } = useAuth()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData>({})
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && token) {
      fetchDashboardData()
    }
  }, [user, token])

  const fetchDashboardData = async () => {
    try {
      const [periodsRes, moodRes, consultationsRes, notificationsRes] = await Promise.all([
        fetch("/api/periods?limit=1", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/mood?limit=1", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/consultations?upcoming=true", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/notifications?unread=true", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      const [periods, moods, consultations, notifications] = await Promise.all([
        periodsRes.json(),
        moodRes.json(),
        consultationsRes.json(),
        notificationsRes.json(),
      ])

      setDashboardData({
        nextPeriod: periods.insights?.nextPredictedPeriod ? new Date(periods.insights.nextPredictedPeriod) : undefined,
        cycleDay: periods.insights?.averageCycleLength || undefined,
        recentMood: moods.moods?.[0]?.mood?.level || undefined,
        consultationsThisMonth: consultations.consultations?.length || 0,
        unreadNotifications: notifications.unreadCount || 0,
        premiumFeatures: user?.subscription?.plan !== "free",
      })
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setDataLoading(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <header className="bg-white/80 backdrop-blur-sm border-b p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.profile.firstName}! 👋</h1>
            <p className="text-gray-600">Here's your wellness overview</p>
          </div>
          <div className="flex items-center gap-4">
            {dashboardData.unreadNotifications > 0 && (
              <Button variant="outline" size="sm" className="relative bg-transparent">
                <Bell className="h-4 w-4" />
                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {dashboardData.unreadNotifications}
                </Badge>
              </Button>
            )}
            <Badge variant={dashboardData.premiumFeatures ? "default" : "secondary"}>
              {user.subscription?.plan || "Free"} Plan
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Period</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.nextPeriod
                  ? `${Math.ceil((dashboardData.nextPeriod.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days`
                  : "Track cycles"}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboardData.nextPeriod ? dashboardData.nextPeriod.toLocaleDateString() : "Start logging periods"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Mood</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.recentMood ? `${dashboardData.recentMood}/10` : "No data"}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboardData.recentMood ? "Last mood entry" : "Start tracking mood"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consultations</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.consultationsThisMonth}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Community</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Active</div>
              <p className="text-xs text-muted-foreground">Join discussions</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Track your health and connect with others</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/tracking/period">
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <Calendar className="mr-2 h-4 w-4" />
                  Log Period
                </Button>
              </Link>
              <Link href="/tracking/mood">
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <Heart className="mr-2 h-4 w-4" />
                  Track Mood
                </Button>
              </Link>
              <Link href="/community">
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  Community Forum
                </Button>
              </Link>
              <Link href="/consultations">
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <Video className="mr-2 h-4 w-4" />
                  Book Consultation
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Health Insights</CardTitle>
              <CardDescription>Your wellness at a glance</CardDescription>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cycle Regularity</span>
                    <Badge variant="outline">Good</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Mood Stability</span>
                    <Badge variant="outline">Stable</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Health Score</span>
                    <Badge variant="outline">85/100</Badge>
                  </div>
                  {!dashboardData.premiumFeatures && (
                    <div className="pt-4 border-t">
                      <Link href="/premium">
                        <Button size="sm" className="w-full">
                          <TrendingUp className="mr-2 h-4 w-4" />
                          Unlock Advanced Analytics
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
