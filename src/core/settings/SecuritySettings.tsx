import React from 'react'
import { ChangePasswordForm } from '../auth/ChangePasswordForm'

export const SecuritySettings = () => {
    return (
        <div className="max-w-2xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Seguridad</h1>
                <p className="text-gray-500 mt-1">Asegura el acceso a tu cuenta.</p>
            </div>

            <div className="space-y-6">
                <ChangePasswordForm />
            </div>
        </div>
    )
}
