import React from 'react';
import { Link } from 'react-router-dom';
import Main from '../layouts/Main';
import challenges from '../data/challenges';
import styles from './Challenges.module.css';

const Challenges = () => {
  // Stats calculation
  const totalChallenges = challenges.length;

  return (
    <Main title="Challenges" description="My Challenges and Accountability Tracker">
      <article className="post" id="challenges">
        <header>
          <div className="title">
            <h2>
              <Link to="/challenges">Challenges</Link>
            </h2>
            <p className={styles.subtitle}>Pushing boundaries, one step at a time.</p>
          </div>
        </header>

        <section>
          <h3 className={styles.sectionTitle}>About Me</h3>
          <p className={styles.descriptionText}>
            I have always been inclined towards pushing my boundaries. From software
            development to marathon running, I find joy in challenging myself to
            learn, grow, and explore new horizons. This drive to better myself
            everyday is what fuels my journey across technology, writing, and
            physical endurance.
          </p>
        </section>

        <section>
          <h3 className={styles.sectionTitle}>Why This Page?</h3>
          <p className={styles.descriptionText}>
            In the pursuit of growth, consistency is key, but often the hardest
            part. This page serves as my public accountability ledger. By
            documenting my challenges here, I am not just tracking progress, but
            making a commitment to myself and the world. It is a space to
            visualize my efforts, celebrate small wins, and stay true to the goals
            I set, ensuring that my ambitions translate into tangible actions.
          </p>
        </section>

        <section>
          <h3 className={styles.sectionTitle}>Active Challenges</h3>
          <ul className={styles.challengeList}>
            {challenges.map((challenge) => (
              <li key={challenge.id} className={styles.challengeCard}>
                <h4 className={styles.challengeTitle}>
                  <Link to={challenge.route}>{challenge.challenge_name}</Link>
                </h4>
                <p className={styles.challengeDesc}>{challenge.challenge_description}</p>
                <div className={styles.dateChip}>
                  <span>Started on: {challenge.challenge_date}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className={styles.sectionTitle}>Stats</h3>
          <div className={styles.statsContainer}>
            <div className={styles.statBox}>
              <span className={styles.statNumber}>{totalChallenges}</span>
              <span className={styles.statLabel}>Total Challenges</span>
            </div>
            {/* Add more generic stats if available */}
          </div>
        </section>
      </article>
    </Main>
  );
};

export default Challenges;
