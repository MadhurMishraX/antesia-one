import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const LEAGUE_THRESHOLDS = [
  { name: 'Bronze', min: 0 },
  { name: 'Silver', min: 500 },
  { name: 'Gold', min: 1500 },
  { name: 'Platinum', min: 3500 },
  { name: 'Diamond', min: 7000 },
]

serve(async (req) => {
  const { submission_id } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // 1. Fetch submission and answers
  const { data: submission, error: subError } = await supabase
    .from('assignment_submissions')
    .select('*, modules(*), student_id')
    .eq('id', submission_id)
    .single()

  if (subError || !submission) {
    return new Response(JSON.stringify({ error: 'Submission not found' }), { status: 404 })
  }

  const { data: answers, error: ansError } = await supabase
    .from('submission_answers')
    .select('*, questions(*)')
    .eq('submission_id', submission_id)

  if (ansError) {
    return new Response(JSON.stringify({ error: 'Answers not found' }), { status: 404 })
  }

  // 2. Grade answers
  let score = 0
  const gradedAnswers = answers.map((ans: any) => {
    let isCorrect = false
    if (ans.questions.question_type === 'MCQ') {
      const correctOption = ans.questions.options.find((o: any) => o.is_correct)
      isCorrect = ans.selected_option_id === correctOption?.option_id
    } else {
      isCorrect = ans.text_answer?.trim().toLowerCase() === ans.questions.correct_answer_text?.trim().toLowerCase()
    }
    if (isCorrect) score++
    return { id: ans.id, is_correct: isCorrect }
  })

  // 3. Update answers in DB
  for (const ans of gradedAnswers) {
    await supabase.from('submission_answers').update({ is_correct: ans.is_correct }).eq('id', ans.id)
  }

  // 4. Update submission
  const submittedAt = new Date()
  const startedAt = new Date(submission.started_at)
  const timeTakenSeconds = Math.floor((submittedAt.getTime() - startedAt.getTime()) / 1000)
  const xpEarned = submission.modules.xp_reward

  await supabase.from('assignment_submissions').update({
    status: 'submitted',
    submitted_at: submittedAt.toISOString(),
    time_taken_seconds: timeTakenSeconds,
    score,
    xp_earned: xpEarned
  }).eq('id', submission_id)

  // 5. Update student stats
  const { data: stats } = await supabase
    .from('student_stats')
    .select('*')
    .eq('student_id', submission.student_id)
    .single()

  if (stats) {
    const newTotalXp = stats.total_xp + xpEarned
    
    // Streak logic
    const today = new Date().toISOString().split('T')[0]
    const lastDate = stats.last_submission_date
    let newStreak = stats.current_streak_days

    if (!lastDate) {
      newStreak = 1
    } else {
      const last = new Date(lastDate)
      const current = new Date(today)
      const diffDays = Math.floor((current.getTime() - last.getTime()) / (1000 * 3600 * 24))
      
      if (diffDays === 1) {
        newStreak += 1
      } else if (diffDays > 1) {
        newStreak = 1
      }
    }

    // League logic
    let newLeague = stats.current_league
    for (const league of LEAGUE_THRESHOLDS) {
      if (newTotalXp >= league.min) {
        newLeague = league.name
      }
    }

    // Accuracy logic
    const { data: allAnswers } = await supabase
      .from('submission_answers')
      .select('is_correct')
      .eq('answer_status', 'answered')
      .in('submission_id', (await supabase.from('assignment_submissions').select('id').eq('student_id', submission.student_id)).data?.map(s => s.id) || [])
    
    const totalCorrect = allAnswers?.filter(a => a.is_correct).length || 0
    const totalAnswered = allAnswers?.length || 1
    const newAccuracy = (totalCorrect / totalAnswered) * 100

    await supabase.from('student_stats').update({
      total_xp: newTotalXp,
      current_streak_days: newStreak,
      longest_streak_days: Math.max(newStreak, stats.longest_streak_days),
      last_submission_date: today,
      current_league: newLeague,
      accuracy_all_time: newAccuracy,
      updated_at: new Date().toISOString()
    }).eq('student_id', submission.student_id)
  }

  return new Response(JSON.stringify({ success: true, score, xpEarned }), {
    headers: { "Content-Type": "application/json" },
  })
})
