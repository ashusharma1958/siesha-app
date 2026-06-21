import { Component, AfterViewInit, ChangeDetectorRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import Swiper from 'swiper';
import { Pagination, Autoplay } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/pagination';

import { environment } from '../../../environments/environment';

type HeroSlide = {
  id: number;
  image: string;
  alt: string;
  productRedirectionUrl?: string;
};

type HeroResponse = {
  statusCode: number;
  message: string;
  body: HeroSlide[];
  timestamp: string;
};

@Component({
  selector: 'app-hero',
  imports: [CommonModule],
  templateUrl: './hero.html',
  styleUrl: './hero.css',
})
export class Hero implements OnInit, AfterViewInit {
  @ViewChild('swiperContainer', { static: false }) swiperContainer: any;

  slides: HeroSlide[] = [];

  swiper: Swiper | undefined;
  viewReady = false;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadSlides();
  }

  ngAfterViewInit() {
    this.viewReady = true;
    this.initSwiperIfReady();
  }

  loadSlides() {
    this.http
      .get<HeroResponse>(`${environment.apiBaseUrl}/home-page/hero`)
      .subscribe({
        next: (response) => {
          this.slides = response.body ?? [];
          this.cdr.detectChanges();
          this.initSwiperIfReady();
        },
        error: (error) => {
          console.error('Failed to load hero slides', error);
        }
      });
  }

  initSwiperIfReady() {
    if (!this.viewReady || !this.swiperContainer || this.slides.length === 0) {
      return;
    }

    setTimeout(() => {
      if (!this.swiperContainer) {
        return;
      }

      if (this.swiper) {
        this.swiper.destroy(true, true);
        this.swiper = undefined;
      }

      this.swiper = new Swiper(this.swiperContainer.nativeElement, {
        modules: [Pagination, Autoplay],
        slidesPerView: 1,
        spaceBetween: 0,
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },
        autoplay: {
          delay: 2500,
          disableOnInteraction: false,
        },
        loop: this.slides.length > 1,
      });
    }, 0);
  }

  trackBySlide(index: number, slide: any): number {
    return slide.id;
  }

  onSlideClick(slide: HeroSlide) {
    const redirectUrl = slide.productRedirectionUrl;

    if (!redirectUrl) {
      return;
    }

    this.router.navigateByUrl(redirectUrl);
  }
}
