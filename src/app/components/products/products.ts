import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

// Import Swiper and modules
import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

@Component({
  selector: 'app-products',
  imports: [CommonModule],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products implements OnInit, AfterViewInit {
  @ViewChild('swiperContainer', { static: false }) swiperContainer: any;

  products = [
    {
      id: 1,
      name: 'Ananas Candle',
      image: '/assets/image/img-1.png',
      originalPrice: 1399,
      salePrice: 1199,
      alt: 'Ananas Candle'
    },
    {
      id: 2,
      name: 'Akhrot Candle',
      image: '/assets/image/img-2.png',
      originalPrice: 1399,
      salePrice: 1199,
      alt: 'Akhrot Candle'
    },
    {
      id: 3,
      name: 'Shankh Candle',
      image: '/assets/image/img-3.png',
      originalPrice: 1399,
      salePrice: 1199,
      alt: 'Shankh Candle'
    },
    {
      id: 4,
      name: 'Moongfali Candle',
      image: '/assets/image/img-4.png',
      originalPrice: 1399,
      salePrice: 1199,
      alt: 'Moongfali Candle'
    }, {
      id: 5,
      name: 'Ananas Candle',
      image: '/assets/image/img-1.png',
      originalPrice: 1399,
      salePrice: 1199,
      alt: 'Ananas Candle'
    },
    {
      id: 6,
      name: 'Akhrot Candle',
      image: '/assets/image/img-2.png',
      originalPrice: 1399,
      salePrice: 1199,
      alt: 'Akhrot Candle'
    },
    {
      id: 7,
      name: 'Shankh Candle',
      image: '/assets/image/img-3.png',
      originalPrice: 1399,
      salePrice: 1199,
      alt: 'Shankh Candle'
    },
    {
      id: 8,
      name: 'Moongfali Candle',
      image: '/assets/image/img-4.png',
      originalPrice: 1399,
      salePrice: 1199,
      alt: 'Moongfali Candle'
    },
     {
      id: 9,
      name: 'Ananas Candle',
      image: '/assets/image/img-1.png',
      originalPrice: 1399,
      salePrice: 1199,
      alt: 'Ananas Candle'
    },
    {
      id: 10,
      name: 'Akhrot Candle',
      image: '/assets/image/img-2.png',
      originalPrice: 1399,
      salePrice: 1199,
      alt: 'Akhrot Candle'
    },
    {
      id: 11,
      name: 'Shankh Candle',
      image: '/assets/image/img-3.png',
      originalPrice: 1399,
      salePrice: 1199,
      alt: 'Shankh Candle'
    },
    {
      id: 12,
      name: 'Moongfali Candle',
      image: '/assets/image/img-4.png',
      originalPrice: 1399,
      salePrice: 1199,
      alt: 'Moongfali Candle'
    }
  ];

  swiper: Swiper | undefined;

  ngOnInit() {}

  ngAfterViewInit() {
    this.initSwiper();
  }

  initSwiper() {
    if (this.swiperContainer) {
      this.swiper = new Swiper(this.swiperContainer.nativeElement, {
        modules: [Navigation, Pagination, Autoplay],
        slidesPerView: 1,
        spaceBetween: 20,
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },
        autoplay: {
          delay: 3000,
          disableOnInteraction: false,
        },
        loop: true,
        breakpoints: {
          640: {
            slidesPerView: 2,
            spaceBetween: 20,
          },
          768: {
            slidesPerView: 3,
            spaceBetween: 30,
          },
          1024: {
            slidesPerView: 4,
            spaceBetween: 40,
          },
        }
      });
    }
  }

  onSlideChange() {
    console.log('slide change');
  }

  trackByProduct(index: number, product: any): number {
    return product.id;
  }

  prevSlide() {
    if (this.swiper) {
      this.swiper.slidePrev();
    }
  }

  nextSlide() {
    if (this.swiper) {
      this.swiper.slideNext();
    }
  }
}
