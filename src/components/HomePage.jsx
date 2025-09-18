import React from "react";
import "./HomePage.css";

const HomePage = () => {
  return (
    <div className="container">
      <header className="header">
        <div className="logo-title">
          <img src="/assets/flowcare-logo.png" alt="SymMuse" className="logo" />
          <h1 className="title">SymMuse</h1>
        </div>
        <nav className="nav">
          <a href="#features">Features</a>
          <a href="#community">Community</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <section className="hero">
  <img
    src="/assets/hero-illustration.png"
    alt="Hero"
    className="hero-img"
  />
  <h2>Your Personal Health & Menstrual Companion</h2>
  <p>
    Track your cycles, log your moods and symptoms, and connect with a
    supportive community. 
    FlowCare is your all-in-one wellness space.
  </p>
</section>


      <section id="features" className="features">
        <div className="card">
          <img src="/assets/period-track.png" alt="Period Tracker" />
          <h3>Period & Mood Tracking</h3>
          <p>Log your cycle, emotions, and physical symptoms with ease.</p>
        </div>
        <div className="card">
          <img src="/assets/community.png" alt="Community" />
          <h3>Supportive Community</h3>
          <p>Share experiences and gain support from others like you.</p>
        </div>
        <div className="card">
          <img src="/assets/consult.png" alt="Teleconsult" />
          <h3>Teleconsultation Access</h3>
          <p>Optional health consultations with certified professionals.</p>
        </div>
      </section>

      <footer id="contact" className="footer">
        <p>Made with ❤️ by SymMuse Team</p>
        <p>© 2025 SymMuse. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HomePage;
