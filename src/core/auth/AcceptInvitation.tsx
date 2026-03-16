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
    const [invitationData, setInvitationData] = useState<{ email: string, name: string } | null>(null);
    const [isExistingUser, setIsExistingUser] = useState(false);
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (!token) {
            setError("No se proporcionó un token de invitación.");
            setIsLoading(false);
            return;
        }

        const verifyToken = async () => {
            try {
                // Fetch invitation details securely using RPC
                const { data, error } = await supabase.rpc('verify_team_invitation', {
                    invitation_token: token
                });

                if (error || !data || !data.valid) {
                    throw new Error(error?.message || "La invitación es inválida, ha expirado o ya fue utilizada.");
                }

                setInvitationData({ email: data.email, name: data.name });
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
            if (isExistingUser) {
                // Login existing user
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: invitationData!.email,
                    password: password
                });
                if (signInError) throw new Error("Contraseña incorrecta. Por favor intenta de nuevo.");
            } else {
                // 1. Attempt to Sign Up
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: invitationData!.email,
                    password: password,
                    options: { data: { name: invitationData!.name } }
                });

                if (signUpError) {
                    if (signUpError.message.includes('already registered')) {
                        setIsExistingUser(true);
                        setPassword('');
                        throw new Error("Ya tienes una cuenta con este correo. Hemos modificado el formulario para que verifiques tu contraseña actual.");
                    } else {
                        throw signUpError;
                    }
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
                    {invitationData ? `Hola, ${invitationData.name}` : 'Únete a tu equipo'}
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
                                {isExistingUser ? 'Ingresa tu Contraseña Actual' : 'Crea tu Contraseña'}
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
                                        <LucideLoader2 className="w-4 h-4 mr-2 animate-spin" /> {isExistingUser ? 'Verificando...' : 'Creando Cuenta...'}
                                    </span>
                                ) : (
                                    isExistingUser ? 'Iniciar Sesión y Aceptar' : 'Crear Cuenta y Aceptar'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
