import React, { useState, useEffect } from "react";

interface TypewriterTextProps {
  phrases: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  delayBetween?: number;
  className?: string;
}

export default function TypewriterText({
  phrases,
  typingSpeed = 50,
  deletingSpeed = 25,
  delayBetween = 2500,
  className = "",
}: TypewriterTextProps) {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentPhrase = phrases[currentPhraseIndex];

    if (isDeleting) {
      // Remove characters
      timer = setTimeout(() => {
        setDisplayedText((prev) => prev.slice(0, -1));
      }, deletingSpeed);
    } else {
      // Add characters
      timer = setTimeout(() => {
        setDisplayedText((prev) => currentPhrase.slice(0, prev.length + 1));
      }, typingSpeed);
    }

    // Handle state transitions
    if (!isDeleting && displayedText === currentPhrase) {
      // Finished typing, pause before starting deletion
      timer = setTimeout(() => {
        setIsDeleting(true);
      }, delayBetween);
    } else if (isDeleting && displayedText === "") {
      // Finished deleting, move to next phrase
      setIsDeleting(false);
      setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
    }

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, currentPhraseIndex, phrases, typingSpeed, deletingSpeed, delayBetween]);

  return (
    <span className={`${className} inline-flex items-center gap-0.5`}>
      <span>{displayedText}</span>
      <span className="w-[2px] h-3.5 bg-emerald-500 animate-pulse shrink-0 inline-block align-middle" />
    </span>
  );
}
