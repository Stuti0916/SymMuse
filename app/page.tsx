import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <header className="flex items-center justify-between p-6 bg-white/80 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3">
          <Image src="/assets/flowcare-logo.png" alt="SymMuse" width={40} height={40} className="rounded-lg" />
          <h1 className="text-2xl font-bold text-purple-800">SymMuse</h1>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="#features" className="text-gray-600 hover:text-purple-600 transition-colors">
            Features
          </Link>
          <Link href="#community" className="text-gray-600 hover:text-purple-600 transition-colors">
            Community
          </Link>
          <Link href="/auth/login" className="text-gray-600 hover:text-purple-600 transition-colors">
            Sign In
          </Link>
          <Link href="/auth/register">
            <Button className="bg-purple-600 hover:bg-purple-700">Get Started</Button>
          </Link>
        </nav>
      </header>

      <section className="flex flex-col items-center text-center py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Image
            src="/assets/hero-illustration.png"
            alt="Hero"
            width={400}
            height={300}
            className="mx-auto mb-8 rounded-2xl shadow-lg"
          />
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Your Personal Health & Menstrual Companion
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Track your cycles, log your moods and symptoms, and connect with a supportive community. SymMuse is your
            all-in-one wellness space.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-lg px-8 py-3">
                Start Your Journey
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3 bg-transparent">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">Everything You Need for Wellness</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Image
                  src="/assets/period-track.png"
                  alt="Period Tracker"
                  width={80}
                  height={80}
                  className="mx-auto mb-4 rounded-lg"
                />
                <CardTitle className="text-purple-800">Period & Mood Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Log your cycle, emotions, and physical symptoms with ease. Get personalized insights and predictions.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Image
                  src="/assets/community.png"
                  alt="Community"
                  width={80}
                  height={80}
                  className="mx-auto mb-4 rounded-lg"
                />
                <CardTitle className="text-purple-800">Supportive Community</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Share experiences and gain support from others like you. Real-time discussions and peer support.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Image
                  src="/assets/consult.png"
                  alt="Teleconsult"
                  width={80}
                  height={80}
                  className="mx-auto mb-4 rounded-lg"
                />
                <CardTitle className="text-purple-800">Teleconsultation Access</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Optional health consultations with certified professionals. Book appointments and get expert advice.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-purple-50">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-6">Ready to Take Control of Your Health?</h3>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of women who trust SymMuse for their wellness journey.
          </p>
          <Link href="/auth/register">
            <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-lg px-8 py-3">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>

      <footer id="contact" className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-lg mb-2">Made with ❤️ by SymMuse Team</p>
          <p className="text-gray-400">© 2025 SymMuse. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
