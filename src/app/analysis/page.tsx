"use client"
import { AnalysisClient } from "@/components/analysis-client";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Campaign, Voter, Call, Task, User } from "@/lib/types";

export default function AnalysisPage() {
  const firestore = useFirestore();
  const campaignsRef = useMemoFirebase(() => firestore ? collection(firestore, 'campaigns') : null, [firestore]);
  const votersRef = useMemoFirebase(() => firestore ? collection(firestore, 'voters') : null, [firestore]);
  const callsRef = useMemoFirebase(() => firestore ? collection(firestore, 'calls') : null, [firestore]);
  const tasksRef = useMemoFirebase(() => firestore ? collection(firestore, 'tasks') : null, [firestore]);
  const usersRef = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);

  const { data: campaigns, isLoading: campaignsLoading } = useCollection<Campaign>(campaignsRef);
  const { data: voters, isLoading: votersLoading } = useCollection<Voter>(votersRef);
  const { data: calls, isLoading: callsLoading } = useCollection<Call>(callsRef);
  const { data: tasks, isLoading: tasksLoading } = useCollection<Task>(tasksRef);
  const { data: users, isLoading: usersLoading } = useCollection<User>(usersRef);


  const isLoading = campaignsLoading || votersLoading || callsLoading || tasksLoading || usersLoading;
  const activeCampaigns = campaigns?.filter(c => c.status === 'En Campaña') || [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Análisis de Campaña</h1>
        <p className="text-muted-foreground">
          Métricas y rendimiento de campañas activas.
        </p>
      </div>
      <AnalysisClient 
        campaigns={activeCampaigns} 
        voters={voters || []}
        calls={calls || []}
        tasks={tasks || []}
        users={users || []}
        isLoading={isLoading} 
      />
    </div>
  )
}
