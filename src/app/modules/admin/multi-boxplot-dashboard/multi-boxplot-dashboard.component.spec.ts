import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultiBoxplotDashboardComponent } from './multi-boxplot-dashboard.component';

describe('MultiBoxplotDashboardComponent', () => {
  let component: MultiBoxplotDashboardComponent;
  let fixture: ComponentFixture<MultiBoxplotDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiBoxplotDashboardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MultiBoxplotDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
