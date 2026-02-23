"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export function FAQSection() {
  const faqs = [
    {
      question: "What does QuizliAI do?",
      answer: "Get detailed and organized notes from any lecture, meeting, or document. Get study materials made by AI including quizzes, practice exams, flashcards, podcasts, videos and more. QuizliAI helps you improve your grades by using AI that doesn't break your University's honor code."
    },
    {
      question: "Is QuizliAI ok to use at my school?",
      answer: "Yes. QuizliAI only helps you learn and capture key details, it doesn't cheat for you. As long as your professor or teacher is cool with you audio recording the class (we've never seen someone who isn't), you're good to go!"
    },
    {
      question: "Is QuizliAI available for iPhone?",
      answer: "Yes, QuizliAI is available for iPhone! The app is free to download and use."
    },
    {
      question: "Is QuizliAI available for Android?",
      answer: "Android version is coming soon! Currently, QuizliAI is available for iPhone and iPad. Sign up for our waitlist to be notified when the Android app launches."
    },
    {
      question: "Is QuizliAI free?",
      answer: "Yes, you can download and use QuizliAI for free to get started. For best results, we recommend upgrading to Unlimited Pass for unlimited notes, priority support, and added features."
    }
  ]

  return (
    <section id="faq" className="w-full max-w-[1200px] mx-auto px-4 mt-[100px] mb-[100px]">
      <div className="bg-[#0D0D0D] rounded-[20px] border border-white/10 p-8 md:p-12">
        {/* Section Header */}
        <div className="mb-12">
          <div className="mb-6">
            <span className="text-[16px] text-[#964CEE] font-rethink-sans border border-[#964CEE]/30 px-4 py-2 rounded-[8px] bg-[#964CEE]/10 inline-block">
              Questions
            </span>
          </div>
          <h2 className="text-[32px] md:text-[40px] font-medium text-white font-inter tracking-[-0.06em] leading-[120%]">
            Frequently Asked <span className="font-source-serif-4 italic font-semibold tracking-[-0.07em]">Questions</span>
          </h2>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border-0 rounded-[12px] bg-white/[0.04] data-[state=open]:bg-white/[0.06] overflow-hidden"
              >
                <AccordionTrigger className="text-left text-[16px] md:text-[18px] font-medium text-white hover:text-white/80 font-rethink-sans hover:no-underline px-6 py-5">
                  {faq.question}
              </AccordionTrigger>
                <AccordionContent className="text-white/50 font-rethink-sans text-[14px] md:text-[16px] leading-relaxed px-6 pb-5">
                  {faq.answer}
              </AccordionContent>
            </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Quote Icon */}
        <div className="mt-12 flex justify-center">
          <div className="w-16 h-16 rounded-[20px] bg-[#964CEE] flex items-center justify-center rotate-90">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 5.5V26.5C15 26.6326 14.9473 26.7598 14.8536 26.8536C14.7598 26.9473 14.6326 27 14.5 27H7C6.46957 27 5.96086 26.7893 5.58579 26.4142C5.21071 26.0391 5 25.5304 5 25V7C5 6.46957 5.21071 5.96086 5.58579 5.58579C5.96086 5.21071 6.46957 5 7 5H14.5C14.6326 5 14.7598 5.05268 14.8536 5.14645C14.9473 5.24021 15 5.36739 15 5.5ZM25 5H17.5C17.3674 5 17.2402 5.05268 17.1464 5.14645C17.0527 5.24021 17 5.36739 17 5.5V26.5C17 26.6326 17.0527 26.7598 17.1464 26.8536C17.2402 26.9473 17.3674 27 17.5 27H25C25.5304 27 26.0391 26.7893 26.4142 26.4142C26.7893 26.0391 27 25.5304 27 25V7C27 6.46957 26.7893 5.96086 26.4142 5.58579C26.0391 5.21071 25.5304 5 25 5Z" fill="white"/>
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
} 