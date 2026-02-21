import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navigation } from '../navigation/navigation';
import { Footer } from '../footer/footer';
import { environment } from '../../../environments/environment';

type SocialProvider = 'google' | 'facebook' | 'apple';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [RouterLink, Navigation, Footer],
  templateUrl: './sign-up.html',
  styleUrls: ['./sign-up.css'],
})
export class SignUpComponent {
  socialSignUp(provider: SocialProvider) {
    const providerUrl = environment.socialAuthUrls?.[provider];

    if (!providerUrl) {
      window.alert(`Social sign-up for ${provider} is not configured yet.`);
      return;
    }

    const callbackUrl = `${window.location.origin}/auth/callback`;
    const separator = providerUrl.includes('?') ? '&' : '?';
    const redirectUrl = `${providerUrl}${separator}redirect_uri=${encodeURIComponent(callbackUrl)}`;

    window.location.href = redirectUrl;
  }
}
