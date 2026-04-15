import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCountryDocuments(countryId: string) {
  return useQuery({
    queryKey: ['country_documents', countryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('country_documents')
        .select('*')
        .eq('country_id', countryId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!countryId,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ countryId, file, userName }: { countryId: string; file: File; userName: string }) => {
      const path = `${countryId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('country-documents')
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbError } = await supabase.from('country_documents').insert({
        country_id: countryId,
        name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        uploaded_by: user?.id ?? null,
        uploaded_by_name: userName,
      });
      if (dbError) throw dbError;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['country_documents', vars.countryId] });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, filePath, countryId }: { id: string; filePath: string; countryId: string }) => {
      await supabase.storage.from('country-documents').remove([filePath]);
      const { error } = await supabase.from('country_documents').delete().eq('id', id);
      if (error) throw error;
      return countryId;
    },
    onSuccess: (countryId) => {
      qc.invalidateQueries({ queryKey: ['country_documents', countryId] });
    },
  });
}
