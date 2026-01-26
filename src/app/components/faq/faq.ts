import { Component, AfterViewInit, ElementRef } from '@angular/core';
import { Navigation } from '../navigation/navigation';
import { Footer } from '../footer/footer';

@Component({
  selector: 'app-faq',
  imports: [Navigation, Footer],
  templateUrl: './faq.html',
  styleUrl: './faq.css',
})
export class Faq implements AfterViewInit {
  constructor(private el: ElementRef) {}

  ngAfterViewInit() {
    const faqItems = this.el.nativeElement.querySelectorAll('.faq-item');

    faqItems.forEach((item: any) => {
      const question = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      const icon = item.querySelector('.faq-icon');

      question.addEventListener('click', () => {
        const isOpen = item.classList.contains('active');
        
        // Close all other FAQ items
        faqItems.forEach((otherItem: any) => {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
            const otherIcon = otherItem.querySelector('.faq-icon');
            otherIcon.classList.remove('fa-minus');
            otherIcon.classList.add('fa-plus');
          }
        });

        // Toggle current item
        item.classList.toggle('active');
        icon.classList.toggle('fa-plus', !isOpen);
        icon.classList.toggle('fa-minus', isOpen);
      });
    });
  }
}
