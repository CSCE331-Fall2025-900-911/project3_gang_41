import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { GoogleLogin, CredentialResponse } from "@react-oauth/google"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useState } from "react"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { t: translate } = useTranslation();
  const navigate = useNavigate();
  const { verifyGoogleToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!credentialResponse.credential) {
        throw new Error(translate('login.noCredential'));
      }

      await verifyGoogleToken(credentialResponse.credential);
      navigate('/cashier');
    } catch (err) {
      console.error('Login failed:', err);
      setError(translate('login.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError(translate('login.googleLoginFailed'));
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8">
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">{translate('login.welcomeBack')}</h1>
                <p className="text-muted-foreground text-balance">
                  {translate('login.loginToAccount')}
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">{translate('login.email')}</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder={translate('login.emailPlaceholder')}
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">{translate('login.password')}</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    {translate('login.forgotPassword')}
                  </a>
                </div>
                <Input id="password" type="password" required />
              </Field>
              <Field>
                <Button type="submit" className="w-full">{translate('login.login')}</Button>
              </Field>
              <Field>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/kiosk')}
                >
                  {translate('login.continueWithout')}
                </Button>
              </Field>
              <Field>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/menuboards')}
                >
                  {'idk where to put this button'}
                </Button>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                {translate('login.orContinueWith')}
              </FieldSeparator>
              <Field>
                <div className="w-full flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    useOneTap={false}
                    text="signin_with"
                    shape="rectangular"
                    theme="outline"
                    size="large"
                    logo_alignment="left"
                    width="320"
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-500 mt-2">{error}</p>
                )}
                {isLoading && (
                  <p className="text-sm text-gray-500 mt-2">{translate('login.loggingIn')}</p>
                )}
              </Field>
              <FieldDescription className="text-center">
                {translate('login.noAccount')} <a href="#" className="underline">{translate('login.signUp')}</a>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="/images/matcha_milk.jpg"
              alt="Boba Tea"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="text-center text-xs">
        {translate('login.agreement')}
      </FieldDescription>
    </div>
  )
}
