import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { LucideShieldCheck, LucideLoader2 } from 'lucide-react';

export const AcceptInvitation = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [invitationData, setInvitationData] = useState<{ email: string } | null>(null);
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (!token) {
            setError("No se proporcionó un token de invitación.");
            setIsLoading(false);
            return;
        }

        const verifyToken = async () => {
            try {
                // Fetch invitation details
                // This relies on the "Public can read by token" RLS policy
                const { data, error } = await supabase
                    .from('team_invitations')
                    .select('email, used, expires_at')
                    .eq('token', token)
                    .single();

                if (error || !data) {
                    throw new Error("La invitación es inválida o no existe.");
                }

                if (data.used) {
                    throw new Error("Esta invitación ya fue utilizada.");
                }

                if (new Date(data.expires_at) < new Date()) {
                    throw new Error("Esta invitación ha expirado.");
                }

                setInvitationData({ email: data.email });
            } catch (err: any) {
                setError(err.message || "Error al verificar la invitación.");
            } finally {
                setIsLoading(false);
            }
        };

        verifyToken();
    }, [token]);

    const handleAccept = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password || password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // 1. Attempt to Sign Up
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: invitationData!.email,
                password: password,
            });

            if (signUpError) {
                // If user already exists, Supabase throws an error.
                // In a perfect system, we'd handle SignIn here, but for MVP we catch the standard error:
                if (signUpError.message.includes('already registered')) {
                     // Try logging in instead
                     const { error: signInError } = await supabase.auth.signInWithPassword({
                         email: invitationData!.email,
                         password: password
                     });
                     if (signInError) {
                         throw new Error("El usuario ya existe, pero la contraseña es incorrecta. Inicia sesión normalmente primero.");
                     }
                } else {
                    throw signUpError;
                }
            }

            // 2. We are authenticated. Now call the RPC to assign the clinic and role.
            const { error: rpcError } = await supabase.rpc('accept_team_invitation', {
                invitation_token: token
            });

            if (rpcError) {
                console.error("RPC Error:", rpcError);
                throw new Error("Fallo al asignar el rol y la sucursal. Contacta a soporte.");
            }

            // 3. Success! Redirect to dashboard
            window.location.href = '/dashboard';

        } catch (err: any) {
            setError(err.message || "Ocurrió un error al procesar tu registro.");
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <LucideLoader2 className="w-8 h-8 text-clinical-600 animate-spin" />
            </div>
        );
    }

    if (error && !invitationData) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full border border-gray-200">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <LucideShieldCheck className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Invitación Inválida</h2>
                    <p className="text-gray-500 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="bg-clinical-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-clinical-700 transition"
                    >
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="bg-clinical-100 p-3 rounded-2xl">
                        <LucideShieldCheck className="w-10 h-10 text-clinical-600" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 border-none">
                    Únete a tu equipo
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Estás siendo invitado para colaborar en 1Clinic.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100">
                    <form className="space-y-6" onSubmit={handleAccept}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Correo Asignado
                            </label>
                            <div className="mt-1">
                                <input
                                    type="email"
                                    disabled
                                    value={invitationData?.email || ''}
                                    className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Crea tu Contraseña
                            </label>
                            <div className="mt-1">
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent sm:text-sm transition-all"
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-clinical-600 hover:bg-clinical-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-clinical-500 disabled:opacity-50 transition-all"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center">
                                        <LucideLoader2 className="w-4 h-4 mr-2 animate-spin" /> Creando Cuenta...
                                    </span>
                                ) : (
                                    'Aceptar Invitación'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
