"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { saveMoveToRegistryFromProfile } from "@/features/admin/actions/registry-actions";
import type { BiomechanicalProfile } from "@/types/dance";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Loader2, Beaker } from "lucide-react";

// Validation Schema
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  category: z.string().min(1, "Please select a category"),
  role: z.enum(["Leader", "Follower", "Both"]),
  description: z.string().optional(),
});

interface RegistryFormProps {
  /** The math result from SignatureCalculator / Dictionary Lab. */
  profile: BiomechanicalProfile;
  onSuccess?: () => void;
  /** Optional genre (e.g. from current app genre when used in Dictionary Lab). */
  genre?: "salsa" | "bachata" | "other" | null;
  /** Prefill move name (e.g. from Dictionary Lab). */
  defaultName?: string;
  /** Prefill category (e.g. from Dictionary Lab). */
  defaultCategory?: string;
}

export default function RegistryForm({
  profile,
  onSuccess,
  genre = null,
  defaultName = "",
  defaultCategory = "General",
}: RegistryFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultName,
      category: defaultCategory || "General",
      role: "Both",
      description: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    const result = await saveMoveToRegistryFromProfile({
      profile,
      name: values.name,
      category: values.category,
      role: values.role,
      description: values.description ?? null,
      genre,
    });
    setLoading(false);

    if (result.success) {
      toast.success(
        `'${values.name}' has been added to the Gold Standard Registry! ✨`
      );
      form.reset();
      onSuccess?.();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Beaker className="w-5 h-5 text-blue-500" />
          Register Move DNA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Move Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Cross Body Lead" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Basics">Basics</SelectItem>
                        <SelectItem value="Turns">Turns</SelectItem>
                        <SelectItem value="Isolation">Isolation</SelectItem>
                        <SelectItem value="Footwork">Footwork</SelectItem>
                        <SelectItem value="General">General</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Leader">Leader</SelectItem>
                        <SelectItem value="Follower">Follower</SelectItem>
                        <SelectItem value="Both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Technical cues for this move..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="p-3 bg-muted rounded-md text-xs font-mono">
              <p className="text-muted-foreground mb-1 uppercase font-bold tracking-tighter">
                Biomechanical Signature Data:
              </p>
              <pre className="max-h-24 overflow-y-auto">
                {JSON.stringify(profile, null, 2)}
              </pre>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving to Encyclopedia...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Commit to Registry
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
