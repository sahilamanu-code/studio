"use client";
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useFirestoreCollection<T>(collectionName: string, ...orderByFields: (string | {field: string, direction: 'asc' | 'desc'})[]) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      const orderByClauses = orderByFields.map(field => {
        if (typeof field === 'string') {
          return orderBy(field);
        }
        return orderBy(field.field, field.direction);
      });
      
      const q = query(collection(db, collectionName), ...orderByClauses);
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const items: T[] = [];
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as T);
        });
        setData(items);
        setLoading(false);
      }, (err) => {
        console.error(err);
        setError(err);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err);
      } else {
        setError(new Error('An unknown error occurred while fetching data.'))
      }
      setLoading(false);
    }
  }, [collectionName]);

  return { data, loading, error };
}
